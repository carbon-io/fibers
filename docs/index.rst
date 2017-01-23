.. fibers documentation master file, created by
   sphinx-quickstart on Tue Nov 15 17:44:33 2016.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

.. toctree:: 
   :maxdepth: 1

======   
Fibers
======

One of the most notable differences between Node.js and other
languages is Node's non-blocking IO, and resulting asyncronous
programming model. While this has many advantages, it can often be
challenging to work with complex callback structures -- a phenomenon
often termed "callback hell".

Many different libraries and techniques exist to help programmers
manage this complexity. While any can be used with Carbon.io, as it
supports both synchronous and asynchronous programming styles,
Carbon-io's preferred technique is to use `Fibers
<https://github.com/laverdet/node-fibers>`_.

Fibers allow you as the programmer to write non-blocking code in a
synchronous style.

Consider the this standard asyncronous operation:

..  code-block:: javascript 
  :linenos: 
     
  fs.sync.readFile('foo.txt', function(err, data) {
    if (err) {
      console.log(err)
    }
    console.log(data)
  })

With Fibers you can do this:

..  code-block:: javascript 
  :linenos: 

  __(function() { // Create a Fiber
    try {
      var data = fs.readFile.sync('foo.txt') // Use sync to invoke synchronously. 
      console.log(data) 
    } catch e {
      console.log(e) 
    }
  })

Note that no callback is passed to ``readFile``. Instead ``readFile``
evaluates to its result or throws an ``Error``. 

Creating Fibers 
---------------

In order to syncronously call asyncronous functions, the calls must
execute inside of a Fiber.

This is done via the ``__`` operator. The ``__`` operator takes a
function of zero arguments and executes that function inside of a
Fiber. Calls to functions via ``sync`` inside the Fiber will cause the
Fiber to block until the function's callback is called, but will do so
without blocking the CPU. Any IO performed inside those functions are
still asynchronous.

Here is a full example:

..  code-block:: javascript 
  :linenos: 

  var carbon = require('carbon-io')
  var __ = carbon.fibers.__(module)

  __(function() { // Create a Fiber
    try {
      var data = fs.readFile.sync('foo.txt') // Use sync to invoke synchronously. 
      console.log(data) 
    } catch e {
      console.log(e) 
    }
  })

Again notice that no callback is passed to ``readFile.sync``. 

The ``__`` function can be used two ways, synchronously, or
asynchronously. The synchronous method is illustated above, where ``__`` does not
return until the function passed to it returns. However, you may also pass a callback to ``__`` in which case it will
return immediately, and the function passed to ``__`` will evaluate
asynchronously.

To illustate, the following code:

..  code-block:: javascript 
  :linenos: 

  var __ = require('.').__(module)
  var fs = require('fs')

  console.log(__(function() { return 0 })) // synchronous

  __(function() { // synchronous
    console.log(1)
  })

  __(function() { // synchronous
    console.log(2)
  })

  __(function() { // asynchronous
    console.log(4)
  }, function(err, result) {
    console.log(5)
  })

  console.log(3)

produces this output:

..  code-block:: sh

  0
  1
  2
  3
  4
  5


  
Using sync 
----------

The ``fibers`` module exposes a ``sync`` property on both
``Function``\s and ``Object``\s.

When ``sync`` is used on a function, ``sync`` returns a new
function that is a synchronous version of the original. The new
function takes the same arguments as the original, except the final
callback parameter. The new function returns the result or throws an
``Error`` if an error occurs.

..  code-block:: javascript 
  :linenos: 

  try {
    var data = fs.readFile.sync('foo.txt') 
  } catch e {
    console.log(e) 
  }

When ``sync`` is used on an object, ``sync`` returns a new object that
is the same as the original except all methods are synchronous.

..  code-block:: javascript 
  :linenos:

  try {
    var data = fs.sync.readFile('foo.txt') 
  } catch e {
    console.log(e) 
  }

When working with instances of "classes" where methods may interact
with a ``this``, one should use the second form:
``obj.sync.<method>(...)``. 

  
Using Fibers in Carbon.io applications
--------------------------------------

When using Fibers in Carbon.io applications you will want to make
sure that all entry points to the event loop are wrapped in Fibers.

One example of this is your main program. You will often see example
applications structured like this:

..  code-block:: javascript 
  :linenos:

  __(function() {
    // application code goes here
  })

This ensures that your application code is run in a Fiber, which will
allow you to use ``sync`` in your application code.

Carbon.io ``Service`` objects automatically wrap each HTTP request in
a Fiber so that your code that handles HTTP requests can use
``sync``.

You may find that there are other times when you need your code to run
in a Fiber, such as the callback to a timer. In each instance you can
use the ``__`` function to create and run a Fiber.

The :ref:`application structure <Application structure>` section of the
:ref:`server guide <Server guide (Carbond)>` provides more
information on how to use Fibers with Carbond.



     
