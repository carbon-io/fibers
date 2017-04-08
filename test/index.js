var o = require('@carbon-io/atom').o(module).main
var _o = require('@carbon-io/bond')._o(module)
var testtube = require('@carbon-io/test-tube')

module.exports = o({
  _type: testtube.Test,
  name: 'FibersTests',
  tests: [
    _o('./__Tests'),
    //_o('./spawnTests')
  ]
})
