var assert = require('assert')

var debug = require('debug')
var mockery = require('mockery')
var sinon = require('sinon')

var o = require('@carbon-io/atom').o(module)
var oo = require('@carbon-io/atom').oo(module)
var _o = require('@carbon-io/bond')._o(module)
var testtube = require('@carbon-io/test-tube')

var __ = require('../index').__(module)

var spawn = undefined
var _spawnBookkeeping = undefined

var FiberSpy = require('./util').FiberSpy
var debugSpy = function(namespace) {
  debugSpy.spy = sinon.spy(debug(namespace))
  return debugSpy.spy
}

/******************************************************************************
 *
 */
var SpawnTest = oo({
  _type: testtube.Test,
  _C: function() {
    this.mod = module
  },
  setup: function() {
    this.parent._setup(this.mod)
  },
  teardown: function() {
    this.parent._teardown()
  }
})

/******************************************************************************
 *
 */
__(function() {
  module.exports = o.main({
    _type: testtube.Test,
    name: 'spawnTests',
    description: 'spawn tests',

    /****************************************************************************
     *
     */
    _setup: function(mod) {
      mockery.registerMock('fibers', FiberSpy)
      mockery.registerMock('debug', debugSpy)

      mockery.enable({
        useCleanCache: true,
        warnOnUnregistered: false,
        warnOnReplace: false
      })
      spawn = require('../index').spawn
      this._spawnBookkeeping = require('../index')._spawnBookkeeping
      this.spawnFibersLength = this._spawnBookkeeping._fibers._length
    },
    
    /****************************************************************************
     *
     */
    _teardown: function() {
      mockery.disable()
      mockery.deregisterAll()
      assert.equal(this._spawnBookkeeping._fibers._length, this.spawnFibersLength)
      spawn = undefined
      FiberSpy.resetAll()
      debugSpy.spy.reset()
    },
    
    /****************************************************************************
     *
     */
    tests: [

      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'noCallbacks',
        doTest: function(ctx, done) {
          var spy = sinon.spy()
          var result = spawn(function() {
            spy(1)
          })
          setImmediate(function() {
            var err = undefined
            try {
              assert.equal(spy.firstCall.args[0], 1)
              assert.equal(FiberSpy.callCount, 1)
            } catch (e) {
              err = e
            }
            done(err)
          })
        }
      }),

      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'noCallbacksException',
        doTest: function(ctx, done) {
          var self = this
          spawn(function() {
            throw new Error(self.name)
          })
          setImmediate(function() {
            var err = undefined
            try {
              assert(debugSpy.spy.firstCall.args[0].includes(self.name))
              assert.equal(FiberSpy.callCount, 1)
            } catch (e) {
              err = e
            }
            done(err)
          })
        }
      }),

      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'errorCallback',
        doTest: function(ctx, done) {
          var error = undefined
          var spy = sinon.spy()
          var result = spawn(function() {
            spy(1)
          }, undefined, function(e) {
            error = e
          })
          setImmediate(function() {
            var err = undefined
            try {
              assert.equal(spy.firstCall.args[0], 1)
              assert.equal(typeof error, 'undefined')
            } catch (e) {
              err = e
            }
            done(err)
          })
        }
      }),
      
      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'errorCallbackException',
        doTest: function(ctx, done) {
          var self = this
          var error = undefined
          var result = spawn(function() {
            throw new Error(self.name)
          }, undefined, function(e) {
            error = e
          })
          setImmediate(function() {
            var err = undefined
            try {
              assert(error instanceof Error)
              assert.equal(error.message, self.name)
              assert.equal(FiberSpy.callCount, 1)
            } catch(e) {
              err = e
            }
            done(err)
          })
        }
      }),
      
      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'nextCallback',
        doTest: function(ctx, done) {
          var result = undefined
          var error = undefined
          spawn(function() {
            return 1
          }, function(_result) {
            result = _result
          })
          try {
            var fiberSpy = FiberSpy.returnValues[0]
            assert.equal(fiberSpy.run.callCount, 0)
          } catch (e) {
            error = e
          }
          setImmediate(function() {
            var err = undefined
            var fiberSpy = undefined
            try {
              assert(typeof error === 'undefined')
              assert.equal(result, 1)
              assert.equal(FiberSpy.callCount, 1)
              fiberSpy = FiberSpy.returnValues[0]
              assert.equal(fiberSpy.run.callCount, 1)
              assert.equal(FiberSpy.yield.callCount, 0)
            } catch (e) {
              err = e
            } 
            done(err)
          })
        }
      }),
      
      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'nextCallbackException',
        doTest: function(ctx, done) {
          var self = this
          var nextSpy = sinon.spy()
          assert.doesNotThrow(function() {
            spawn(function() {
              throw new Error(self.name)
            }, nextSpy)
          }, Error)
          setImmediate(function() {
            var fiberSpy = undefined
            var err = undefined
            try {
              assert.equal(FiberSpy.callCount, 1)
              fiberSpy = FiberSpy.returnValues[0]
              assert.equal(fiberSpy.run.callCount, 1)
              assert(!FiberSpy.yield.called)
              assert.equal(debugSpy.spy.callCount, 2)
            } catch (e) {
              err = e
            }
            done(err)
          })
        }
      }),
      
      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'nextAndErrorCallback',
        doTest: function(ctx, done) {
          var result = undefined
          var error = undefined
          var errorSpy = sinon.spy()
          spawn(function() {
              return 1
            }, function(_result) {
              result = _result
            }, 
            errorSpy
          )
          try {
            // run on nextTick
            var fiberSpy = FiberSpy.returnValues[0]
            assert.equal(fiberSpy.run.callCount, 0)
          } catch (e) {
            error = e
          }
          setImmediate(function() {
            var fiberSpy = undefined
            var err = undefined
            try {
              assert.equal(result, 1)
              assert.equal(FiberSpy.callCount, 1)
              fiberSpy = FiberSpy.returnValues[0]
              assert.equal(fiberSpy.run.callCount, 1)
              assert.equal(FiberSpy.yield.callCount, 0)
              assert(!errorSpy.called)
            } catch (e) {
              err = e
            } 
            done(err)
          })
        }
      }),
      
      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'nextAndErrorCallbackException',
        doTest: function(ctx, done) {
          var self = this
          var error = undefined
          var nextSpy = sinon.spy()
          assert.doesNotThrow(function() {
            spawn(function() {
                throw new Error(self.name)
              }, 
              nextSpy,
              function(e) {
                error = e
              }
            )
          }, Error)
          setImmediate(function() {
            var fiberSpy = undefined
            var err = undefined
            try {
              assert.equal(FiberSpy.callCount, 1)
              fiberSpy = FiberSpy.returnValues[0]
              assert.equal(fiberSpy.run.callCount, 1)
              assert(!FiberSpy.yield.called)
              assert.equal(debugSpy.spy.callCount, 1)
              assert(!nextSpy.called)
            } catch (e) {
              err = e
            } 
            done(err)
          })
        }
      }),

      /**************************************************************************
       * 
       */
      o({
        _type: SpawnTest,
        name: 'syncCallWithNestedAsyncCallUsingFutures',
        doTest: function(ctx, done) {
          var self = this
          var error = undefined
          var result = undefined
          spawn(function() {
            var asyncFunc = function(cb) {
              process.nextTick(function() {
                cb(null, 1)
              })
            }
            result = asyncFunc.sync.call(this)
          })
          setImmediate(function() {
            var err = undefined
            try {
              assert.equal(result, 1)
            } catch (e) {
              err = e
            }
            done(err)
          })
        }
      })
    ]
  })
})
