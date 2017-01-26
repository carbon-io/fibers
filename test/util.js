var Fiber = require('fibers')
var sinon = require('sinon')

var FiberSpy = sinon.spy(function(func) {
  var fiber = Fiber(func)
  sinon.spy(fiber, 'run')  
  return fiber
})

FiberSpy.yield = Fiber.yield
sinon.spy(FiberSpy, 'yield')

Object.defineProperty(FiberSpy, 'current', {
  enumerable: true,
  configurable: false,
  get: function() {
    return Fiber.current
  }
})

FiberSpy.resetAll = function() {
  FiberSpy.reset()
  FiberSpy.yield.reset()
}

module.exports = {
  FiberSpy: FiberSpy
}
