var assert = require('assert')
var fs = require('fs')

var mockery = require('mockery')
var sinon = require('sinon')

var o = require('@carbon-io/atom').o(module)
var testtube = require('@carbon-io/test-tube')

var fibers = require('../../..')

var __ = fibers.__(module)

var CarbonIOMock = {
  fibers: fibers
}

__(function() {
  module.exports = o.main({
    _type: testtube.Test,
    name: 'SyncAsyncTests',
    setup: function() {
      this.logSpy = sinon.spy(console, 'log')
      mockery.registerMock('@carbon-io/carbon-io', CarbonIOMock)
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      })
    },
    teardown: function() {
      mockery.disable()
      mockery.deregisterMock('@carbon-io/carbon-io')
      this.logSpy.restore()
    },
    tests: [
      o({
        _type: testtube.Test,
        name: 'AsyncTest',
        setup: function() {
          this.cb = undefined
          this.rawReadFile = fs.readFile
          this.readFileStub = sinon.stub(fs, 'readFile') 
        },
        teardown: function() {
          this.readFileStub.restore()
        },
        doTest: function(ctx, done) {
          var self = this
          var callCount = 0
          var logFileContentsAsync = 
            require('../examples/syncAsync').logFileContentsAsync
          var results = {failure: undefined, success: undefined}
          this.readFileStub.callsFake(function(path, cb) {
            self.rawReadFile(path, function(err, data) {
              cb(err, data)
              switch(path) {
                case '/does/not/exist':
                  results.failure = err
                  break
                default:
                  results.success = data
                  break
              }
              if (++callCount == 2) {
                var err = undefined
                try {
                  assert.equal(results.success, 'foo')
                  assert(results.failure instanceof Error)
                } catch (e) {
                  err = e
                }
                done(err)
              }
            })
          })
          logFileContentsAsync(undefined)
          logFileContentsAsync('/does/not/exist')
        }
      }),
      o({
        _type: testtube.Test,
        name: 'SyncTest',
        setup: function() {
          this.parent.logSpy.reset()
        },
        doTest: function() {
          var logFileContentsSync = 
            require('../examples/syncAsync').logFileContentsSync
          logFileContentsSync(undefined)
          logFileContentsSync('/does/not/exist')
          assert.equal(this.parent.logSpy.firstCall.args[0], 'foo')
          assert(this.parent.logSpy.secondCall.args[0] instanceof Error)
        }
      }),
      o({
        _type: testtube.Test,
        name: 'SyncObjectTest',
        setup: function() {
          this.parent.logSpy.reset()
        },
        doTest: function() {
          var logFileContentsObjectSync = 
            require('../examples/syncAsync').logFileContentsObjectSync
          logFileContentsObjectSync(undefined)
          logFileContentsObjectSync('/does/not/exist')
          assert.equal(this.parent.logSpy.firstCall.args[0], 'foo')
          assert(this.parent.logSpy.secondCall.args[0] instanceof Error)
        }
      }),
      o({
        _type: testtube.Test,
        name: 'SyncReturnValueTest',
        setup: function() {
          this.parent.logSpy.reset()
        },
        doTest: function(ctx, done) {
          var logFileContentsReturnValSync = 
            require('../examples/syncAsync').logFileContentsReturnValSync
          logFileContentsReturnValSync(undefined, function(err, data) {
            try {
              assert(err === null)
              assert.equal(data, 'foo')
            } catch (e) {
              return done(e)
            }
            logFileContentsReturnValSync('/does/not/exist', function(err, data) {
              try {
                assert(typeof data === 'undefined')
                assert(err instanceof Error)
              } catch (e) {
                return done(e)
              }
              return done()
            })
          })
        }
      })
    ]
  })
})


