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

mockery.registerMock('fibers', FiberSpy)
mockery.registerMock('debug', debugSpy)

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
    mockery.enable({
      useCleanCache: true,
      warnOnUnregistered: false,
      warnOnReplace: false
    })
    __ = require('../index').__(mod)
    this._spawnBookkeeping = require('../index')._spawnBookkeeping
    this.spawnFibersLength = this._spawnBookkeeping._fibers._length
  },

  /****************************************************************************
   *
   */
  _teardown: function() {
    mockery.disable()
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
     *
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
     *
     *
    // __.detach tests
    o({
      _type: __Test,
      name: 'detachNoCbTest',
      doTest: function(context, done) {
        var error = undefined
        var wait = __.detach(function() {
          return 1
        })
        try {
          assert(FiberSpy.called)
          assert.equal(wait(), 1)
        } catch (e) {
          error = e
        }
        setImmediate(function() {
          done(error)
        })
      }
    }),
    o({
      _type: __Test,
      name: 'detachNoCbErrTest',
      doTest: function(context, done) {
        var self = this
        var error = undefined
        var x = undefined
        var wait = undefined
        assert.doesNotThrow(function() {
          wait = __.detach(function() {
            x = 1
            throw new Error(self.name)
          })
        }, Error)
        setImmediate(function() {
          try {
            assert(FiberSpy.called)
            assert.throws(function() {
              wait()
            }, new RegExp(self.name))
            assert.equal(x, 1)
          } catch (e) {
            error = e
          } finally {
            done(error)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'detachCbTest',
      doTest: function(context, done) {
        // NOTE: we dispatch the result to two places here...
        var self = this
        var error = undefined
        var x = 0
        var wait = __.detach(function() {
          return x + 1
        }, function(err, result) {
          if (err) {
            error = err
            return
          }
          try {
            assert(FiberSpy.called)
            assert.equal(result, 1)
            assert(!err)
          } catch (e) {
            error = e
          }
        })
        setImmediate(function() {
          var result = undefined
          try {
            assert.doesNotThrow(function() {
              result = wait()
            }, Error)
            assert.equal(result, 1)
          } catch (e) {
            error = e
          } finally {
            done(error)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'detachCbErrTest',
      doTest: function(context, done) {
        var self = this
        var x = 0
        var error = undefined
        var wait = __.detach(function() {
          throw new Error(self.name)
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert(!result)
            assert(err instanceof Error)
          } catch (e) {
            error = e
          }
        })
        setImmediate(function() {
          try {
            assert.throws(function() {
              wait()
            }, new RegExp(self.name))
          } catch (e) {
            error = e
          }
          done(error)
        })
      }
    }),
    // __.main tests with mod == require.main
    o({
      _type: __Test,
      name: 'mainMainNoCbTest',
      mod: require.main,
      doTest: function() {
        var x = __.main(function() {
          return 1
        })
        assert(!FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainMainNoCbErrTest',
      mod: require.main,
      doTest: function() {
        var self = this
        var x = undefined
        assert.throws(function() {
          __.main(function() {
            x = 1
            throw new Error(self.name)
          })
        }, Error)
        assert(!FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainMainCbTest',
      mod: require.main,
      doTest: function(context, done) {
        var x = 0
        var exp = undefined
        __.main(function() {
          return x + 1
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert.equal(result, 1)
            assert(!err)
          } catch (e) {
            done = done.bind(undefined, e)
          } finally {
            setImmediate(done)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'mainMainCbErrTest',
      mod: require.main,
      doTest: function(context, done) {
        var self = this
        var x = 0
        var exp = undefined
        __.main(function() {
          throw new Error(self.name)
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert(!result)
            assert(err instanceof Error)
          } catch (e) {
            done = done.bind(undefined, e)
          } finally {
            setImmediate(done)
          }
        })
      }
    }),
    // __.main.detach tests with mod == require.main
    o({
      _type: __Test,
      name: 'mainDetachNoCbTest',
      mod: require.main,
      doTest: function(context, done) {
        var error = undefined
        var wait = __.main.detach(function() {
          return 1
        })
        try {
          assert(FiberSpy.called)
          assert.equal(wait(), 1)
        } catch (e) {
          error = e
        }
        setImmediate(function() {
          done(error)
        })
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachNoCbErrTest',
      mod: require.main,
      doTest: function(context, done) {
        var self = this
        var error = undefined
        var x = undefined
        var wait = undefined
        assert.doesNotThrow(function() {
          wait = __.main.detach(function() {
            x = 1
            throw new Error(self.name)
          })
        }, Error)
        setImmediate(function() {
          try {
            assert(FiberSpy.called)
            assert.throws(function() {
              wait()
            }, new RegExp(self.name))
            assert.equal(x, 1)
          } catch (e) {
            error = e
          } finally {
            done(error)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachCbTest',
      mod: require.main,
      doTest: function(context, done) {
        // NOTE: we dispatch the result to two places here...
        var self = this
        var error = undefined
        var x = 0
        var wait = __.main.detach(function() {
          return x + 1
        }, function(err, result) {
          if (err) {
            error = err
            return
          }
          try {
            assert(FiberSpy.called)
            assert.equal(result, 1)
            assert(!err)
          } catch (e) {
            error = e
          }
        })
        setImmediate(function() {
          var result = undefined
          try {
            assert.doesNotThrow(function() {
              result = wait()
            }, Error)
            assert.equal(result, 1)
          } catch (e) {
            error = e
          } finally {
            done(error)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachCbErrTest',
      mod: require.main,
      doTest: function(context, done) {
        var self = this
        var x = 0
        var error = undefined
        var wait = __.main.detach(function() {
          throw new Error(self.name)
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert(!result)
            assert(err instanceof Error)
          } catch (e) {
            error = e
          }
        })
        setImmediate(function() {
          try {
            assert.throws(function() {
              wait()
            }, new RegExp(self.name))
          } catch (e) {
            error = e
          }
          done(error)
        })
      }
    }),
    // __.main tests with mod != require.main
    o({
      _type: __Test,
      name: 'mainNoMainNoCbTest',
      doTest: function() {
        var x = __.main(function() {
          return 1
        })
        assert(!FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainNoMainNoCbErrTest',
      doTest: function() {
        var self = this
        var x = undefined
        assert.throws(function() {
          __.main(function() {
            x = 1
            throw new Error(self.name)
          })
        }, Error)
        assert(!FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainNoMainCbTest',
      doTest: function() {
        var x = 0
        var exp = undefined
        __.main(function() {
          return x + 1
        }, function(err, result) {
          exp = err
          x = result
        })
        assert(!FiberSpy.called)
        assert.equal(x, 1)
        assert(!exp)
      }
    }),
    o({
      _type: __Test,
      name: 'mainNoMainCbErrTest',
      doTest: function() {
        var self = this
        var x = 0
        var exp = undefined
        __.main(function() {
          throw new Error(self.name)
        }, function(err, result) {
          exp = err
          x = result
        })
        assert(!FiberSpy.called)
        assert(!x)
        assert(exp instanceof Error)
      }
    }),
    // __.main.detach tests with mod != require.main
    o({
      _type: __Test,
      name: 'mainDetachNoMainNoCbTest',
      doTest: function() {
        var wait = __.main.detach(function() {
          return 1
        })
        assert(!FiberSpy.called)
        assert.equal(wait(), 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachNoMainNoCbErrTest',
      doTest: function() {
        var self = this
        var x = undefined
        var wait = __.main.detach(function() {
          x = 1
          throw new Error(self.name)
        })
        assert.throws(function() {
          wait()
        }, new RegExp(self.name))
        assert(!FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachNoMainCbTest',
      doTest: function() {
        var x = 0
        var error = undefined
        var wait = __.main.detach(function() {
          return x + 1
        }, function(err, result) {
          error = err
          x = result
        })
        assert(!FiberSpy.called)
        assert.equal(x, 1)
        assert.equal(error, null)
        assert.equal(wait(), 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainDetachNoMainCbErrTest',
      doTest: function() {
        var self = this
        var x = 0
        var error = undefined
        var wait = __.main.detach(function() {
          throw new Error(self.name)
        }, function(err, result) {
          error = err
          x = result
        })
        assert(!FiberSpy.called)
        assert.equal(typeof x, 'undefined')
        assert(error.message.match(new RegExp(this.name)))
        assert.throws(function() {
          wait()
        }, new RegExp(this.name))
      }
    })
    */
  ]
})

