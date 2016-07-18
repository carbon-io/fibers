/*******************************************************************************
 *
 * Copyright (c) 2012 ObjectLabs Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var spawn = require('fibers-utils').spawn

/*******************************************************************************
 * __
 */
function __(f, cb) {
  if (cb) {
    spawn(f, 
          function(result) {
            cb(null, result)
          },
          function(err) {
            cb(err)
          })
  } else {
    spawn(f)
  }
}

__.main = function(mod) {
  return function(f) {
    if (require.main === mod) {
      spawn(f)
    } else {
      f()
    }
  }
}

/*******************************************************************************
 * __f
 */
/*
function __f(f) {
  return function() {
    __(f)
  }
}

OR
(

function __f(f) {
  __(f(arguments))
}

AND

function f__(f) {
  return function() { 
    __(f(arguments)) 
  }
}

*/

/*******************************************************************************
 * exports
 */
module.exports = __

module.exports.__ = __ // XXX might want to decide
//module.exports.__f = __f // XXX might want to decide
