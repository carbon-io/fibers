var fs = require('fs')
var path = require('path')

var carbon = require('@carbon-io/carbon-io')
var __ = carbon.fibers.__(module)

var DEFAULT_PATH = path.join(__dirname, 'data', 'foo.txt')

function logFileContentsAsync(path) {
  path = path || DEFAULT_PATH
  fs.readFile(path, function(err, data) {
    if (err) {
      console.log(err)
    } else {
      console.log(data)
    }
  })
}

function logFileContentsSync(path) {
  path = path || DEFAULT_PATH
  __(function() {
    try {
      var data = fs.readFile.sync(path)
      console.log(data)
    } catch (err) {
      console.log(err)
    } 
  })
}

function logFileContentsObjectSync(path) {
  path = path || DEFAULT_PATH
  __(function() {
    try {
      var data = fs.sync.readFile(path)
      console.log(data)
    } catch (err) {
      console.log(err)
    } 
  })
}

function logFileContentsReturnValSync(path, cb) {
  path = path || DEFAULT_PATH
  __(function() {
    return fs.readFile.sync(path)
  }, cb)
}

function logFileContentsSyncFullExample() {
  var fs = require('fs')

  var carbon = require('@carbon-io/carbon-io')
  var __ = carbon.fibers.__(module)

  __(function() {
    var path = process.env.EXAMPLE_PATH || '/foo/bar'
    try {
      var data = fs.readFile.sync(path)
      console.log(data)
    } catch (err) {
      console.log(err)
    } 
  })
}

module.exports = {
  logFileContentsAsync: logFileContentsAsync,
  logFileContentsSync: logFileContentsSync,
  logFileContentsObjectSync: logFileContentsObjectSync,
  logFileContentsReturnValSync: logFileContentsReturnValSync,
  logFileContentsSyncFullExample: logFileContentsSyncFullExample
}
