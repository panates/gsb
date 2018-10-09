/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const Type = require('./Type');

const PROPERTIES = ['serialize', 'parseValue', 'parseLiteral'];

class ScalarType extends Type {

  /**
   * @param {Schema} owner
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   * @override
   */
  constructor(owner, name, cfg) {
    super(owner, name, cfg);
    this._kind = 'scalar';
    if (cfg)
      for (const n of PROPERTIES) {
        if (cfg[n])
          this[n] = cfg[n];
      }
  }

  /**
   *
   * @return {Function}
   */
  get serialize() {
    return this._serialize;
  }

  /**
   *
   * @param {Function} fn
   */
  set serialize(fn) {
    this._serialize = fn;
  }

  /**
   *
   * @return {Function}
   */
  get parseValue() {
    return this._parseValue;
  }

  /**
   *
   * @param {Function} fn
   */
  set parseValue(fn) {
    this._parseValue = fn;
  }

  /**
   *
   * @return {Function}
   */
  get parseLiteral() {
    return this._parseLiteral;
  }

  /**
   *
   * @param {Function} fn
   */
  set parseLiteral(fn) {
    this._parseLiteral = fn;
  }

  toJSON() {
    const out = super.toJSON();
    for (const n of PROPERTIES) {
      if (this[n])
        out[n] = this[n];
    }
    return out;
  }

}

module.exports = ScalarType;
