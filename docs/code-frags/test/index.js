var _o = require('@carbon-io/bond')._o(module)
var o = require('@carbon-io/atom').o(module)
var testtube = require('@carbon-io/test-tube')

var fibers = require('../../..')

var __ = fibers.__(module)

__(function() {
  o.main({
    _type: testtube.Test,
    name: 'FibersCodeFragsTests',
    tests: [
      _o('./basicExecutionOrderTests'),
      _o('./syncAsyncTests')
    ]
  })
})

