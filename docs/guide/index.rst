======   
Fibers
======

One of the most notable differences between Node.js and other languages is
Node's non-blocking IO, and resulting asynchronous programming model. While this
has many advantages, it can often be challenging to work with complex callback
structures -- a phenomenon often termed "callback hell" or "pyramid of doom."

Many different libraries and techniques exist to help programmers manage this
complexity. While any can be used with Carbon.io, as it supports both
synchronous and asynchronous programming styles, Carbon.io's preferred
technique is to use `fibers <https://github.com/laverdet/node-fibers>`_.

While ``fibers`` provides basic coroutine support, ``Carbon.io`` implements the
abstractions necessary to allow you as the programmer to more easily write
non-blocking code in a synchronous style.

Consider this standard asynchronous operation:

.. literalinclude:: ../code-frags/examples/syncAsync.js
  :language: javascript
  :lines: 11-17
  :dedent: 2
  :linenos: 
     

With ``fibers`` you can do this:

.. literalinclude:: ../code-frags/examples/syncAsync.js
  :language: javascript
  :lines: 22-29
  :dedent: 2
  :linenos: 

Note that no callback is passed to ``readFile``. Instead ``readFile``
evaluates to its result or throws an ``Error``. 

Creating Fibers 
---------------

In order to synchronously call asynchronous functions, the calls must
execute inside of a ``Fiber``.

This is done via the ``__`` operator. The ``__`` operator takes a function of
zero arguments and executes that function inside of a ``Fiber``. Calls to
functions via ``sync`` inside the ``Fiber`` will cause the ``Fiber`` to block
until the function's callback is called, but will do so without blocking the
process. Any IO performed inside those functions is still asynchronous.

Here is a full example:

.. literalinclude:: ../code-frags/examples/syncAsync.js
  :language: javascript
  :lines: 52-65
  :dedent: 2
  :linenos: 

Again notice that no callback is passed to ``readFile.sync``. 

The ``__`` operator itself executes synchronously or asynchronously depending on the
context in which it is invoked. If it is called within the context of an active
``Fiber``, it executes synchronously, otherwise it executes asynchronously. This
allows you to have multiple entry points to your application, bootstrapping as
appropriate, while pulling in other ``Fiber`` aware modules synchronously. While the
usefulness of this may not be immediately obvious, it should become clear as
you become more familiar with the Carbon.io landscape (see: ``@carbon-io/test-tube``).

To illustate, the following code:

.. literalinclude:: ../code-frags/examples/basicExecutionOrder.js
  :language: javascript
  :linenos: 

produces this output:

.. literalinclude:: ../code-frags/test/basicExecutionOrderTests.js
  :language: sh
  :lines: 68-84
  :linenos:

In addition to the bare ``__`` operator, as you may have noticed from the
previous example, fibers provides the ``__.spawn`` function which will always
execute asynchronously (``__`` actually delegates execution to ``__.spawn`` in
the case that it is invoked outside of an active ``Fiber``).
  
Using sync 
----------

The ``fibers`` module exposes a ``sync`` property on both ``Functions`` and
``Objects``.

When ``sync`` is used on a function, ``sync`` returns a new function that is a
synchronous version of the original. The new function takes the same arguments
as the original, except the final callback parameter, and returns
the result or throws an ``Error`` if an error occurs.

.. literalinclude:: ../code-frags/examples/syncAsync.js
  :language: javascript
  :lines: 23-24,26-28
  :dedent: 4
  :linenos: 

When ``sync`` is used on an object, ``sync`` returns a new object that
is the same as the original except all methods are synchronous.

.. literalinclude:: ../code-frags/examples/syncAsync.js
  :language: javascript
  :lines: 35-36,38-40
  :dedent: 4
  :linenos: 

When working with instances of "classes" where methods may interact
with a ``this``, one should use the second form:
``obj.sync.<method>(...)``. 

Return Values
-------------

Currently, ``__`` and ``__.spawn`` return ``undefined``. If you want to perform some computation asynchronously and retrieve the result, you can do this by passing an "errback".
  
Using Fibers in Carbon.io applications
--------------------------------------

When using ``Fibers`` in Carbon.io applications you will want to make
sure that all entry points to the event loop are wrapped in ``__``.

One example of this is your main program. You will often see example
applications structured like this:

..  code-block:: javascript 
  :linenos:

  __(function() {
    // application code goes here
  })

This ensures that your application code is run in a ``Fiber``, which will
allow you to use ``sync`` in your application code.

Additionally, you will often see test modules structured as follows:

..  code-block:: javascript 
  :linenos:

  __(function() {
    module.exports = o({
      // application code and exported functionality
    })
  })

This indicates that the module can be used as both an entry point and as a
dependency. Dependants of modules written in this fashion should be careful to
``require`` these dependencies from within a call to ``__``. If this pattern is
not adhered to, strange behavior will result as ``module.exports`` will be
initialized asynchronously and the dependant module will receive an empty
object (e.g. ``{}``) instead of the expected value.

Carbon.io ``Service`` objects automatically wrap each HTTP request in
a ``Fiber`` so that your code that handles HTTP requests can use
``sync``.

You may find that there are other times when you need your code to run
in a ``Fiber``, such as the callback to a timer. In each instance you can
use the ``__`` function to create and run a Fiber.

The :ref:`application structure <Application structure>` section of the
:ref:`server guide <Server guide (Carbond)>` provides more
information on how to use ``Fibers`` with ``Carbond``.

Debugging
---------

If your application is exiting suddenly or behaving differently than you would
expect, it could be that an unhandled exception is the cause. Normally, these
exceptions are swallowed silently (note, this is a programming error as these
exceptions should be handled further up the call chain), but you can enable
logging of these errors via the `debug <https://github.com/visionmedia/debug>`_
module by adding ``DEBUG="@carbon-io/fibers"`` to the environment. 



