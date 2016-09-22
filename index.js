var Fiber = require("fibers")
require('fibrous')

/*******************************************************************************
 * __
 */
function __(mod) {
  var result = function(f, cb) {
    if (cb) {
      spawn(f, 
            function(result) {
              cb(null, result)
            },
            function(err) {
              cb(err)
            })
    } else {
      spawn(f)
    }
  }
  result.main = function(f, cb) {
    if (require.main === mod) {
      if (cb) {
        spawn(f, 
              function(result) {
                cb(null, result)
              },
              function(err) {
                cb(err)
              })
      } else {
        spawn(f)
      }
    } else {
      var result = f()
      if (cb) {
        return(cb(null, result))
      }
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
 */
function spawn(f, next, error) {
  Fiber(function() {
    try {
      var result = f();
      if (next) { next(result); }
    } catch(e) {
      console.error(e.stack);
      if (error) { error(e); }
    }
  }).run()
}

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
