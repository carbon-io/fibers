var assert = require('assert')

var debug = require('debug')
var mockery = require('mockery')
var sinon = require('sinon')

var o = require('@carbon-io/atom').o(module).main
var oo = require('@carbon-io/atom').oo(module)
var _o = require('@carbon-io/bond')._o(module)
var testtube = require('@carbon-io/test-tube')

var __ = undefined
var _spawnBookkeeping = undefined

var FiberSpy = require('./util').FiberSpy
var debugSpy = function(namespace) {
  debugSpy.spy = sinon.spy(debug(namespace))
  return debugSpy.spy
}

/******************************************************************************
 *
 */
var __Test = oo({
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
module.exports = o({
  _type: testtube.Test,
  name: '__Tests',
  description: '__ tests',

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
    __ = require('../index').__
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
    __ = undefined
    FiberSpy.resetAll()
    debugSpy.spy.reset()
  },

  /****************************************************************************
   *
   */
  tests: [

    /**************************************************************************
     * __ tests
     */
    o({
      _type: __Test,
      name: 'noCbTest',
      doTest: function() {
        var spy = sinon.spy()
        __(function() {
          spy(1)
        })
        assert(!FiberSpy.called)
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),

    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'noCbErrTest',
      doTest: function() {
        var self = this
        var spy = sinon.spy()
        assert.throws(function() {
          __(function() {
            spy(1)
            throw new Error(self.name)
          })
        }, Error)
        assert(!FiberSpy.called)
        assert(debugSpy.spy.firstCall.args[0].includes(this.name))
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),

    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'cbTest',
      doTest: function() {
        var error = undefined
        var result = undefined
        __(function() {
          return 1
        }, function(e, r) {
          error = e
          result = r
        })
        assert(!FiberSpy.called)
        assert.equal(result, 1)
        assert(!error)
      }
    }),

    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'cbErrTest',
      doTest: function() {
        var self = this
        var error = undefined
        var result = undefined
        __(function() {
          throw new Error(self.name)
        }, function(e, r) {
          error = e
          result = r
        })
        assert(!FiberSpy.called)
        assert.equal(typeof result, 'undefined')
        assert(error instanceof Error)
        assert(error.toString().includes(this.name))
      }
    }),
    
    /**************************************************************************
     * __ tests outside of fiber
     */
    o({
      _type: __Test,
      name: 'noCbTestNoFiber',
      setup: function() {
        __Test.prototype.setup.call(this)
        sinon.stub(FiberSpy, '_getCurrent').returns(undefined)
      },
      teardown: function() {
        FiberSpy._getCurrent.restore()
        __Test.prototype.teardown.call(this)
      },
      doTest: function(ctx, done) {
        var spy = sinon.spy()
        __(function() {
          spy(1)
        })
        setImmediate(function() {
          var err = undefined
          try {
            assert(FiberSpy.called)
            assert.equal(spy.firstCall.args[0], 1)
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
      _type: __Test,
      name: 'noCbErrTestNoFiber',
      setup: function() {
        __Test.prototype.setup.call(this)
        sinon.stub(FiberSpy, '_getCurrent').returns(undefined)
      },
      teardown: function() {
        FiberSpy._getCurrent.restore()
        __Test.prototype.teardown.call(this)
      },
      doTest: function(ctx, done) {
        var self = this
        var spy = sinon.spy()
        assert.doesNotThrow(function() {
          __(function() {
            spy(1)
            throw new Error(self.name)
          })
        }, Error)
        setImmediate(function() {
          var err = undefined
          try {
            assert(FiberSpy.called)
            assert.equal(debugSpy.spy.callCount, 2)
            assert(debugSpy.spy.firstCall.args[0].includes(self.name))
            assert(debugSpy.spy.secondCall.args[0].includes(self.name))
            assert.equal(spy.firstCall.args[0], 1)
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
      _type: __Test,
      name: 'cbTestNoFiber',
      setup: function() {
        __Test.prototype.setup.call(this)
        sinon.stub(FiberSpy, '_getCurrent').returns(undefined)
      },
      teardown: function() {
        FiberSpy._getCurrent.restore()
        __Test.prototype.teardown.call(this)
      },
      doTest: function(ctx, done) {
        var err = undefined
        var res = undefined
        __(function() {
          return 1
        }, function(e, r) {
          err = e
          res = r
        })
        setImmediate(function() {
          try {
            assert(FiberSpy.called)
            assert.equal(typeof error, 'undefined')
            assert.equal(res, 1)
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
      _type: __Test,
      name: 'cbErrTestNoFiber',
      setup: function() {
        __Test.prototype.setup.call(this)
        sinon.stub(FiberSpy, '_getCurrent').returns(undefined)
      },
      teardown: function() {
        FiberSpy._getCurrent.restore()
        __Test.prototype.teardown.call(this)
      },
      doTest: function(ctx, done) {
        var self = this
        var err = undefined
        var res = undefined
        var spy = sinon.spy()
        __(function() {
          spy(1)
          throw new Error(self.name)
        }, function(e, r) {
          err = e
          res = r
        })
        setImmediate(function() {
          try {
            assert(FiberSpy.called)
            assert.equal(spy.firstCall.args[0], 1)
            assert.equal(typeof res, 'undefined')
            assert(err instanceof Error)
            assert(err.message.includes(self.name))
            err = undefined
          } catch (e) {
            err = e
          }
          done(err)
        })
      }
    }),
    
    
    /**************************************************************************
     * __.main tests with mod == require.main
     */
    o({
      _type: __Test,
      name: 'mainMainNoCbTest',
      mod: require.main,
      doTest: function() {
        var spy = sinon.spy()
        __.main(function() {
          spy(1)
        })
        assert(!FiberSpy.called)
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainMainNoCbErrTest',
      mod: require.main,
      doTest: function() {
        var self = this
        var spy = sinon.spy()
        assert.throws(function() {
          __.main(function() {
            spy(1)
            throw new Error(self.name)
          })
        }, Error)
        assert(!FiberSpy.called)
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainMainCbTest',
      mod: require.main,
      doTest: function() {
        var res = undefined
        var err = undefined
        __.main(function() {
          return 1
        }, function(e, r) {
          err = e
          res = r
        })
        assert(!FiberSpy.called)
        assert.equal(res, 1)
        assert(!err)
      }
    }),

    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainMainCbErrTest',
      mod: require.main,
      doTest: function() {
        var self = this
        var err = undefined
        var res = undefined
        __.main(function() {
          throw new Error(self.name)
        }, function(e, r) {
          err = e
          res = r
        })
        assert(!FiberSpy.called)
        assert.equal(typeof res, 'undefined')
        assert(err instanceof Error)
      }
    }),

    /**************************************************************************
     * __.main tests with mod != require.main
     */
    o({
      _type: __Test,
      name: 'mainNoMainNoCbTest',
      doTest: function() {
        var spy = sinon.spy()
        __.main(function() {
          spy(1)
        })
        assert(!FiberSpy.called)
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainNoMainNoCbErrTest',
      doTest: function() {
        var self = this
        var spy = sinon.spy()
        assert.throws(function() {
          __.main(function() {
            spy(1)
            throw new Error(self.name)
          })
        }, Error)
        assert(!FiberSpy.called)
        assert.equal(spy.firstCall.args[0], 1)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainNoMainCbTest',
      doTest: function() {
        var err = undefined
        var res = undefined
        __.main(function() {
          return 1
        }, function(e, r) {
          err = e
          res = r
        })
        assert(!FiberSpy.called)
        assert.equal(res, 1)
        assert.equal(err, null)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'mainNoMainCbErrTest',
      doTest: function() {
        var self = this
        var err = undefined
        var res = undefined
        __.main(function() {
          throw new Error(self.name)
        }, function(e, r) {
          err = e
          res = r
        })
        assert(!FiberSpy.called)
        assert.equal(typeof res, 'undefined')
        assert(err instanceof Error)
        assert.equal(err.message, this.name)
      }
    }),
    
    /**************************************************************************
     *
     */
    o({
      _type: __Test,
      name: 'ensureSpawnMainRefTest',
      doTest: function() {
        assert.equal(__(module), __)

        assert.equal(__, __.ensure)
        assert.equal(__, __.ensure.ensure)

        assert(__.spawn !== __)
        assert(__.spawn !== __.ensure)
        assert.equal(__.spawn, __.spawn.spawn)

        assert.equal(__.spawn.ensure, __)
        assert.equal(__.spawn.ensure, __.ensure)
        assert.equal(__.spawn.ensure, __.ensure.ensure)
        assert.equal(__.spawn.ensure.ensure, __)
        assert.equal(__.spawn.ensure.ensure, __.ensure)
        assert.equal(__.spawn.ensure.ensure, __.ensure.ensure)

        assert.equal(__.ensure.spawn, __.spawn)
        assert.equal(__.ensure.spawn, __.spawn.spawn)
        assert.equal(__.ensure.spawn.spawn, __.spawn)
        assert.equal(__.ensure.spawn.spawn, __.spawn.spawn)

        assert.equal(__.ensure.spawn.ensure, __.ensure)
        assert.equal(__.spawn.ensure.spawn, __.spawn)

        assert.equal(__.ensure.spawn.ensure.main, __.main)
        assert.equal(__.spawn.ensure.spawn.main, __.main)
      }
    })
  ]
})

