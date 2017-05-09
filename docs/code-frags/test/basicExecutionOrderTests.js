var assert = require('assert')

var Fiber = require('fibers')
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
    name: 'BasicExecutionOrderTests',
    setup: function() {
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
    },
    tests: [
      o({
        _type: testtube.Test,
        name: 'OutputTest',
        setup: function() {
          var self = this
          var counter = 0
          this.getCurrentFiberStub = 
            sinon.stub(
              CarbonIOMock.fibers.__, '_getCurrentFiber')
          this.getCurrentFiberStub.onCall(
            counter++).returns(undefined)
          this.getCurrentFiberStub.onCall(
            counter++).returns(undefined)
          for (var i=0; i<9; i++) {
            this.getCurrentFiberStub.onCall(
              counter++).returns(new Fiber(sinon.spy()))
          }
          this.output = ''
          this.logStub = sinon.stub(console, 'log').callsFake(function(msg) {
            self.output += msg + '\n'
          })
        },
        teardown: function() {
          this.logStub.restore()
          this.getCurrentFiberStub.restore()
        },
        doTest: function(ctx, done) {
          var self = this
          require('../examples/basicExecutionOrder')
          setImmediate(function() {
            var err = undefined
            try {
              assert.equal(self.output.trim(), `
foo
bar
baz
---
0
1
2
3
4
5
---
1
3
4
5
0
2
`.trim())
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

