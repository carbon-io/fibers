var inspect = require('util').inspect

var debug = require('debug')('@carbon-io/fibers')

var fibrous = require('@carbon-io/fibrous')
var Fiber = require('fibers')
// NOTE: we need to grab Future from fibrous since fibrous defines future on
//       Function.prototype as an accessor descriptor and Future does not guard
//       against resetting this property on Function.prototype.
var Future = fibrous.Future

/*******************************************************************************
 * __
 */
function __(mod) {
  var detach = false
  // XXX: can we substitute undefined for null when calling cb
  var result = function(f, cb) {
    if (cb) {
      // if we've got a callback, then run async
      return spawn(f, 
                   function(result) {
                     cb(null, result)
                   },
                   function(err) {
                     cb(err)
                   },
                   detach)
    }
    // otherwise block
    return spawn(f, undefined, undefined, detach)
  }
  result.detach = function(f, cb) {
    detach = true
    return result(f, cb)
  }
  result.main = function(f, cb) {
    if (require.main === mod) {
      // DRY
      return result(f, cb)
    }
    // otherwise we just run the function synchronously and pass the result back
    // via the callback if one is supplied or as the return value of this function
    var ret = undefined
    try {
      ret = f()
      if (cb) {
        cb(null, ret)
      }
      if (detach) {
        return function() {
          return ret
        }
      } else if (!cb) {
        return ret
      }
    } catch (e) {
      if (cb) {
        cb(e)
      }
      if (detach) {
        return function() {
          throw e
        }
      } else if (!cb) {
        throw e
      }
    }
  }
  result.main.detach = function(f, cb) {
    detach = true
    return result.main(f, cb)
  }
  return result
}

/*******************************************************************************
 * __f
 */
/*
  function __f(f) {
    return function() {
      __(f)
    }
  }
  
OR

function __f(f) {
  __(f(arguments))
}

AND

function f__(f) {
  return function() { 
    __(f(arguments)) 
  }
}

*/

/****************************************************************************************************
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
 * @return {*} returns what the method would have returned via the supplied callback
               callback accepted by invoked async method must be of form f(err, value)
 * @throws {Error} 
 *
 * @ignore
 */
function syncInvoke(that, method, args) {
  var result
  var fiber = Fiber.current
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

/****************************************************************************************************
 * getPoolSize
 *
 * @returns Fiber's current pool size
 */
function getFiberPoolSize() {
  return Fiber.poolSize
}

/****************************************************************************************************
 * setPoolSize
 *
 * @param {Integer} poolSize - set Fiber's pool size to poolSize
 */
function setFiberPoolSize(poolSize) {
  Fiber.poolSize = poolSize
}

/****************************************************************************************************
 * getFibersCreated
 *
 * @returns The number of fibers created
 */
function getFibersCreated() {
  return Fiber.fibersCreated
}

/****************************************************************************************************
 * spawn
 *
 * @param {Function} f - function to spawn within a Fiber
 * @param {Function} next - optional callback
 * @param {Function} error - optional callback
 * @param {Function} detach - run f asynchronously and return a function to wait
 *                            on the result
 * @returns result - if `next` is not passed, the result of `f` will be returned
 * @throws {Exception} - if no error callback is passed, any exception will be
 *                       bubbled up if running synchronously, otherwise, errors
 *                       will be lost
 */
function spawn(f, next, error, detach) {
  // the new fiber
  var fiber = undefined
  // use to retrieve the return value if f yields
  var future = new Future()
  // the return value for f
  var ret = undefined
  // disambiguate "undefined" return value
  var returned = false
  // the error object thrown by f
  var err = undefined
  // whether or not f yielded
  var yielded = false
  // signal that we are falling back to detach mode when spawning root fiber
  var detachFallback = false
  // wrapper function for f to be run in a new fiber
  var fiberFunction = function() {
    try {
      // execute f
      // note: this may yield internally
      ret = f()
      returned = true
      if (next) { 
        // if a callback is supplied then pass then pass on the result and exit the fiber
        next(ret)
      }
      if (!next || detach) {
        // otherwise spawn is blocking
        if (yielded) {
          // if f yielded, unblock the spawn call
          return future.return()
        } else {
          // otherwise, executed without yielding, then no need for the future
          return 
        }
      }
      if (next) {
        // return if next was defined and we didn't go the detach route
        return
      }
    } catch (e) {
      debug(e.stack)
      // save the error
      err = e
      if (error) { 
        // if there's an error callback then throw it that way
        error(e)
      } 
      if (!error || detach) {
        if (typeof next === 'undefined' && yielded) {
          // if spawn is blocking and we yielded, then throw via the future
          return future.throw(e)
        } else {
          // otherwise, just throw it
          throw e
        }
      }
      if (error) {
        // return if error was defined and we didn't go the detach route
        return
      }
    } finally {
      // clean up 
      var fiber_ = spawn._fibers[fiber.__spawnId]
      if (typeof fiber_ === 'undefined') {
        throw new Error('Failed to find current fiber in spawn.fibers')
      }
      // remove our handle on this fiber so that it will get garbage collected
      delete spawn._fibers[fiber.__spawnId]
      --spawn._fibers._length
    }
  }
  // function used to block and wait for a result
  var blockFunction = function() {
    blockFunction.__runCalled.wait()
    if (returned) {
      // if returned is true, then f executed without yielding, so return the result
      return ret
    }
    if (typeof err === 'undefined') {
      // if err is undefined, then f yielded without error
      yielded = true
      // note: this will throw if there is an exception and there is no error callback
      future.wait()
      // when future.wait returns, then we have a result, return it
      return ret
    } else {
      // otherwise we didn't yield and there was an exception
      // XXX: do we want to throw here? previously, we did not if there was an
      //      error callback
      throw err
    }
  }
  blockFunction.__runCalled = new Future()

  detach = detach ? true : false

  if (!next && !detach) {
    // if a callback was not passed execute synchronously in this fiber
    // first off, make sure we're in a fiber
    if (typeof Fiber.current === 'undefined') {
      debug('trying to invoke spawn synchronously outside of a fiber, falling ' +
            'back to async')
      detachFallback = true
    } else {
      try {
        return f()
      } catch (e) {
        if (error) {
          return error(e)
        }
        throw e
      }
    }
  }
  
  fiber = new Fiber(fiberFunction)

  // maintain a handle for this fiber so it doesn't get garbage collected
  fiber.__spawnId = spawn._getFiberId()
  spawn._fibers[fiber.__spawnId] = fiber
  ++spawn._fibers._length

  // otherwise, run async on nextTick 
  process.nextTick(function() {
    try {
      fiber.run()
    } catch (e) {
      if (detachFallback) {
        throw e
      }
      // we will only get here if next is defined, but error is not
      // assume that the caller doesn't care if there is an error, but log
      // to `debug` in case
      debug('Exception caught with error undefined in fibers.spawn: ' +
            inspect(e))
    } finally {
      if (detach) {
        blockFunction.__runCalled.return()
      }
    }
  })

  return detach ? blockFunction : undefined
}
// Number.MAX_SAFE_INTEGER == 9007199254740991
// this would roll over in 104249 days at 10**6 spawns/sec
spawn._getFiberId = function() {
  return spawn._fiberId++
}
spawn._fiberId = 0
spawn._fibers = {_length: 0}


/****************************************************************************************************
 * module.exports
 */
module.exports = {
  __:  __,
  getFiberPoolSize: getFiberPoolSize,
  setFiberPoolSize: setFiberPoolSize,
  getFibersCreated: getFibersCreated,
  syncInvoke: syncInvoke, // Backward compat
  spawn: spawn // Backward compat 
}

Object.defineProperty(module.exports, '$Test', {
  enumerable: false,
  configurable: false,
  writeable: false,
  get: function() {
    return require('./test/index.js')
  }
})
