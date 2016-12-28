var inspect = require('util').inspect

var debug = require('debug')('@carbon-io/fibers')

var Fiber = require("fibers")
require('@carbon-io/fibrous')

/*******************************************************************************
 * __
 */
function __(mod) {
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
                   })
    }
    // otherwise block
    return spawn(f)
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
        return cb(null, ret)
      }
      return ret
    } catch (e) {
      if (cb) {
        return cb(e)
      }
      throw e
    }
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
  var result;
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
  });

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
 * spawn
 *
 * @param {Function} f - function to spawn within a Fiber
 * @param {Function} next - optional callback
 * @param {Function} error - optional callback
 * @returns result - if `next` is not passed, the result of `f` will be returned
 * @throws {Exception} - if no error callback is passed, any exception will be
 *                       bubbled up
 */
function spawn(f, next, error) {
  var caughtErr = false
  var fiber = Fiber(function() {
    try {
      var ret = f();
      if (next) { 
        return next(ret)
      } else {
        Fiber.yield(ret)
      }
    } catch(e) {
      caughtErr = true
      debug(e.stack);
      if (error) { 
        return error(e)
      } else {
        throw e
      }
    } finally {
      var fiberIndex = spawn.fibers.indexOf(fiber)
      if (fiberIndex == -1) {
        throw new Error('Failed to find current fiber in spawn.fibers')
      }
      // remove our handle on this fiber so that it will get garbage collected
      spawn.fibers.splice(fiberIndex, 1)
    }
  })
  // maintain a handle for this fiber so it doesn't get garbage collected
  spawn.fibers.push(fiber)
  if (!next) {
    // if `next` is not defined, then execute synchronously
    var ret = fiber.run()
    if (!caughtErr) {
      // in this case we know yield was called, so force the Fiber to complete
      fiber.run()
    }
    // return the result
    return ret
  }
  // otherwise, run async on nextTick 
  process.nextTick(function() {
    try {
      fiber.run()
    } catch (e) {
      // we will only get here if next is defined, but error is not
      // assume that the caller doesn't care if there is an error, but log
      // to `debug` in case
      debug('exception caught with error undefined in fibers.spawn: ' +
            inspect(e))
    }
  })
}

spawn.fibers = []

/****************************************************************************************************
 * module.exports
 */
module.exports = {
  __:  __,
  getFiberPoolSize: getFiberPoolSize,
  setFiberPoolSize: setFiberPoolSize,
  syncInvoke: syncInvoke, // Backward compat
  spawn: spawn // Backward compat  
}
