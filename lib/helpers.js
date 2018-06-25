/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ArgumentError} = require('./errors');
const promisify = require('putil-promisify');

/**
 *
 * @param {String} s
 * @return {{type: String, list, nonNullItems, nonNull: boolean}}
 */
function parseTypeString(s) {
  if (s) {
    let m = s.match(/^(\w+)(!)?$/);
    if (m) {
      return {
        type: m[1],
        list: false,
        nonNullItems: false,
        nonNull: !!m[2]
      };
    }
    m = s.match(/^\[(\w+)(!)?](!)?$/);
    if (m) {
      return {
        type: m[1],
        list: true,
        nonNullItems: !!m[2],
        nonNull: !!m[3]
      };
    }
  }
  throw new ArgumentError('"%s" is not a valid type definition', s);
}

/**
 *
 * @param {String} s
 * @return {{type: String, list, nonNullItems, nonNull: boolean, defaultValue: *}}
 */
function parseInputTypeString(s) {
  if (s) {
    let m = s.match(/^(\w+)(!)?(?: *= *(?:(.*?)"|(\d*\.?\d*)))?$/);
    if (m) {
      return {
        type: m[1],
        list: false,
        nonNullItems: false,
        nonNull: !!m[2],
        defaultValue: m[3] || (m[4] ? parseFloat(m[4]) : undefined)
      };
    }
    m = s.match(/^\[(\w+)(!)?](!)?$/);
    if (m) {
      return {
        type: m[1],
        list: true,
        nonNullItems: !!m[2],
        nonNull: !!m[3]
      };
    }
  }
  throw new ArgumentError('"%s" is not a valid type definition', s);
}

function makeArray(...values) {
  const arr = [];
  values.forEach(i => {
    if (!i) return;
    if (Array.isArray(i))
      arr.push(...i);
    else arr.push(i);
  });
  return arr;
}

function mergeCalls(fns) {
  if (!fns)
    return;
  if (typeof fns === 'function')
    return fns;
  fns = Array.isArray(fns) ? fns.slice() : [fns];
  if (!fns.length)
    return;

  const callNext = (stack, cb, ...args) => {
    const fn = stack.shift();
    const handleResult = (err, v) => {
      if (err)
        return cb(err);
      if (v)
        return cb(null, v);
      process.nextTick(() => callNext(stack, cb, ...args));
    };
    if (typeof fn !== 'function')
      return handleResult();

    try {
      const v = fn(...args);
      if (promisify.isPromise(v))
        v.then(
            val => handleResult(null, val),
            err => handleResult(err));
      else {
        handleResult(null, v);
      }
    } catch (err) {
      return cb(err);
    }
  };

  return (...args) => {
    return promisify.fromCallback(cb => callNext(fns.slice(), cb, ...args));
  };
}

module.exports = {
  parseTypeString,
  parseInputTypeString,
  makeArray,
  mergeCalls
};
