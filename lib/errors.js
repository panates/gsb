/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ErrorEx, ArgumentError} = require('errorex');

class SchemaError extends ErrorEx {
  constructor(msg, ...args) {
    super(msg, ...args);
  }
}

module.exports = {ErrorEx, ArgumentError, SchemaError};