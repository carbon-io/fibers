var assert = require('assert')

var mockery = require('mockery')
var sinon = require('sinon')

var o = require('@carbon-io/atom').o(module).main
var oo = require('@carbon-io/atom').oo(module)
var _o = require('@carbon-io/bond')._o(module)
var testtube = require('@carbon-io/test-tube')

var spawn = undefined
var __ = undefined

var FiberSpy = require('./util').FiberSpy

mockery.registerMock('fibers', FiberSpy)

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

module.exports = o({
  _type: testtube.Test,
  name: '__Tests',
  description: '__ tests',
  _setup: function(mod) {
    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    })
    __ = require('../index').__(mod)
    spawn = require('../index').spawn
  },
  _teardown: function() {
    mockery.disable()
    assert.equal(spawn.fibers.length, 0)
    __ = undefined
    spawn = undefined
    FiberSpy.resetAll()
  },
  tests: [
    // __ tests
    o({
      _type: __Test,
      name: 'noCbTest',
      doTest: function() {
        var x = __(function() {
          return 1
        })
        assert(FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'noCbErrTest',
      doTest: function() {
        var self = this
        var x = undefined
        assert.throws(function() {
          __(function() {
            x = 1
            throw new Error(self.name)
          })
        }, Error)
        assert(FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'cbTest',
      teardown: function() {
      },
      doTest: function(done) {
        var x = 0
        var exp = undefined
        __(function() {
          return x + 1
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert.equal(result, 1)
            assert(!err)
          } finally {
            setImmediate(done)
          }
        })
      }
    }),
    o({
      _type: __Test,
      name: 'cbErrTest',
      doTest: function(done) {
        var self = this
        var x = 0
        var exp = undefined
        __(function() {
          throw new Error(self.name)
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert(!result)
            assert(err instanceof Error)
          } finally {
            setImmediate(done)
          }
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
        assert(FiberSpy.called)
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
        assert(FiberSpy.called)
        assert.equal(x, 1)
      }
    }),
    o({
      _type: __Test,
      name: 'mainMainCbTest',
      mod: require.main,
      doTest: function(done) {
        var x = 0
        var exp = undefined
        __.main(function() {
          return x + 1
        }, function(err, result) {
          try {
            assert(FiberSpy.called)
            assert.equal(result, 1)
            assert(!err)
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
      doTest: function(done) {
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
          } finally {
            setImmediate(done)
          }
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
  ]
})

