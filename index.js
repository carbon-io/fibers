var inspect = require('util').inspect
var Module = require('module')

var debug = require('debug')('@carbon-io/fibers')

var fibrous = require('@carbon-io/fibrous')
var Fiber = require('fibers')
// NOTE: we need to grab Future from fibrous since fibrous defines future on
//       Function.prototype as an accessor descriptor and Future does not guard
//       against resetting this property on Function.prototype.
var Future = fibrous.Future

var _debugLogger = function(mod, msg) {
  debug(msg)
  if (mod === require.main) {
    console.error(msg)
  }
}

/******************************************************************************
 * getPoolSize
 *
 * @returns Fiber's current pool size
 */
function getFiberPoolSize() {
  return Fiber.poolSize
}

/******************************************************************************
 * setPoolSize
 *
 * @param {Integer} poolSize - set Fiber's pool size to poolSize
 */
function setFiberPoolSize(poolSize) {
  Fiber.poolSize = poolSize
}

/******************************************************************************
 * getFibersCreated
 *
 * @returns The number of fibers created
 */
function getFibersCreated() {
  return Fiber.fibersCreated
}

/******************************************************************************
 * getCurrentFiber
 *
 * @returns The current fiber
 */
function getCurrentFiber() {
  return Fiber.current
}

var __spawn = function(f, cb, logger) {
  if (cb) {
    return spawn(f,
                 function(result) {
                   cb(null, result)
                 },
                 function(err) {
                   cb(err)
                 },
                 logger)
  }
  return spawn(f, undefined, undefined, logger)
}

// ensure that f gets executed in a Fiber:
var __ensure =  function(mod) {
  // XXX: consider using `Module.parent` and `delete require.cache[module.id]`
  if (!(mod instanceof Module)) {
    throw new TypeError('Module required (e.g., "var __ = require(\'@carbon-io/fibers\').__(module)")')
  }
  var __ = function(f, cb) {
    if (typeof __ensure._getCurrentFiber() === 'undefined') {
      return __spawn(f, cb, _debugLogger.bind(undefined, mod))
    }
    var ret = undefined
    try {
      ret = f()
      if (cb) {
        cb(null, ret)
      }
    } catch (e) {
      _debugLogger(
        mod, 'Exception caught with cb undefined in __: ' + inspect(e))
      if (cb) {
        cb(e)
      } else {
        throw e
      }
    }
  }

  //  __(.main)?
  __.main = function() {
    console.warn('"__.main" is DEPRECATED and no longer necessary')
    return __.apply(undefined, arguments)
  }

  //  __(.ensure)*(.main)?
  __.ensure = __

  //  __(.(ensure|main))*
  __.main.ensure = __

  //  __(.(ensure|main))*(.spawn)?
  __.spawn = __spawn

  //  __(.(ensure|main))*(.spawn(.main(.(ensure|main))*)?)?
  __.spawn.main = __.main

  //  __(.(ensure|main))*(.spawn(.(ensure|main))*)?
  __.spawn.ensure = __

  //  __(.(spawn|ensure|main))*
  __.spawn.spawn = __spawn

  return __
}

// to allow stubbing in tests (can probably get rid of this with proxy objects?)
__ensure._getCurrentFiber = getCurrentFiber

/******************************************************************************
 * syncInvoke
 *
 * Based on technique used by 0ctave and olegp:
 *     (https://github.com/0ctave/node-sync/blob/master/lib/sync.js)
 *     (https://github.com/olegp/mongo-sync/blob/master/lib/mongo-sync.js)
 *
 * @param {Object} that - receiver
 * @param {String} method - name of method
 * @param {Array} args
 *
 * @return {*} returns what the method would have returned via the supplied
 *             callback accepted by invoked async method must be of form
 *             f(err, value)
 * @throws {Error}
 *
 * @ignore
 */
function syncInvoke(that, method, args) {
  var result
  var fiber = getCurrentFiber()
  var yielded = false
  var callbackCalled = false
  var wasError = false

  // augment original args with callback
  args = args ? Array.prototype.slice.call(args) : []
  args.push(function(error, value) {
    callbackCalled = true
    if (error) {
      wasError = true
    }
    if (yielded) { // this may or may not occur after the yield() call below
      fiber.run(error || value)
    } else {
      result = error || value
    }
  })

  // apply() may or may not result in callback being called synchronously
  that[method].apply(that, args)
  if (!callbackCalled) { // check if apply() called callback
    yielded = true
    result = Fiber.yield()
  }

  if (wasError) {
    if (result instanceof Error){
      throw result
    } else {
      var errorMsg = result.message || JSON.stringify(result)
      throw new Error(errorMsg)
    }
  }
  return result
}

// Number.MAX_SAFE_INTEGER == 9007199254740991
// this would roll over in 104249 days at 10**6 spawns/sec

var _spawnBookkeeping = {
  _fiberId: 0,
  _fibers: {_length: 0},
  _getFiberId: function() {
    return this._fiberId++
  }
}

/******************************************************************************
 * spawn
 *
 * @param {Function} f - function to spawn within a Fiber
 * @param {Function} next - optional callback
 * @param {Function} error - optional callback
 * @returns result - if `next` is not passed, the result of `f` will be returned
 * @throws {Exception} - if no error callback is passed, any exception will be
 *                       bubbled up if running synchronously, otherwise, errors
 *                       will be lost
 */
function spawn(f, next, error, logger) {
  // XXX: logger is explicitly omitted from the documentation since this is 
  //      just a temporary fix
  var fiberFunction = function(fiberId) {
    var ret = undefined
    try {
      ret = f()
      if (next) {
        return next(ret)
      } else {
        // drop it
      }
    } catch (e) {
      (logger || debug)(e.stack)
      if (error) {
        // if there's an error callback then throw it that way
        return error(e)
      } else {
        throw e
      }
    } finally {
      // clean up
      var fiber_ = _spawnBookkeeping._fibers[fiberId]
      if (typeof fiber_ === 'undefined') {
        throw new Error('Failed to find current fiber in spawn.fibers')
      }
      // remove our handle on this fiber so that it will get garbage collected
      delete _spawnBookkeeping._fibers[fiberId]
      --_spawnBookkeeping._fibers._length
    }
  }

  var fiberId = _spawnBookkeeping._getFiberId()

  var fiber = new Fiber(fiberFunction.bind(undefined, fiberId))

  // maintain a handle for this fiber so it doesn't get garbage collected
  _spawnBookkeeping._fibers[fiberId] = fiber
  ++_spawnBookkeeping._fibers._length

  // otherwise, run async on nextTick
  process.nextTick(function(fiber) {
    try {
      fiber.run()
    } catch (e) {
      // we will only get here if next is defined, but error is not
      // assume that the caller doesn't care if there is an error, but log
      // to `debug` in case
      (logger || debug)(
        'Exception caught with error undefined in fibers.spawn: ' + inspect(e))
    }
  }.bind(undefined, fiber))
}

/******************************************************************************
 * module.exports
 */
module.exports = {
  __:  __ensure,
  getFiberPoolSize: getFiberPoolSize,
  setFiberPoolSize: setFiberPoolSize,
  getFibersCreated: getFibersCreated,
  getCurrentFiber: getCurrentFiber,
  syncInvoke: syncInvoke, // Backward compat
  spawn: spawn, // Backward compat
  _spawnBookkeeping: _spawnBookkeeping, // expose spawn bookkeeping for tests
}

Object.defineProperty(module.exports, '$Test', {
  enumerable: false,
  configurable: false,
  writeable: false,
  get: function() {
    return require('./test/index.js')
  }
})
