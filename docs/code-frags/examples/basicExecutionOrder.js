var fs = require('fs')

var carbon = require('@carbon-io/carbon-io')
var __ = carbon.fibers.__(module)

console.log('foo')

__(function() {                 // asynchronous
  
  console.log('---')

  __(function() {               // synchronous
    console.log(0)              
  })
  
  __(function() {               // synchronous
    return 1
  }, function(err, result) {
    console.log(result)
  })

  __(function() {               // synchronous
    console.log(2)
  })

  __(function() {               // synchronous
    console.log(3)
  })

  __(function() {               // synchronous
    console.log(4)
    return 5
  }, function(err, result) {
    console.log(result)
  })
})

console.log('bar')

__(function() {                 // asynchronous

  console.log('---')

  __.spawn(function() {         // asynchronous
    console.log(0)              
  })

  __(function() {               // synchronous
    return 1
  }, function(err, result) {
    console.log(result)
  })

  __.spawn(function() {         // asynchronous
    console.log(2)
  })

  __(function() {               // synchronous
    console.log(3)
  })

  __(function() {               // synchronous
    console.log(4)
    return 5
  }, function(err, result) {
    console.log(result)
  })
})

console.log('baz')
