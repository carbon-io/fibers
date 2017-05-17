var assert = require('assert')
var fs = require('fs')

var tmp = require('tmp')

var o = require('@carbon-io/atom').o(module)
var testtube = require('@carbon-io/test-tube')

var __ = require('../index').__(module)
var sync = require('../index').syncInvoke

/******************************************************************************
 *
 */
__(function() {
  module.exports = o.main({
    _type: testtube.Test,
    name: 'SyncInvokeTests',
    description: '"syncInvoke" tests.',
    setup: function() {
      this.tmpFile = tmp.fileSync()
      fs.writeFileSync(this.tmpFile.name, 'foobarbaz')
    },
    teardown: function() {
      this.tmpFile.removeCallback()
    },
    tests: [
      o({
        _type: testtube.Test,
        name: 'SyncInvokeFunctionTest',
        doTest: function() {
          assert.equal(sync(undefined, fs.readFile, [this.parent.tmpFile.name]),
                       'foobarbaz')
        }
      }),
      o({
        _type: testtube.Test,
        name: 'SyncInvokeMethodTest',
        readFile: function(name, cb) {
          return fs.readFile(name, cb)
        },
        doTest: function() {
          assert.equal(sync(this, 'readFile', [this.parent.tmpFile.name]),
                       'foobarbaz')
        }
      })
    ]
  })
})
