/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ArgumentError} = require('./errors');

class XMap extends Map {

  /**
   *
   * @param {Function} converter
   */
  constructor(converter) {
    super();
    this._converter = converter;
  }

  /**
   *
   * @param {String} name Name
   * @param {Object} value Value
   * @return {XMap}
   */
  set(name, value) {
    const v = this._converter ? this._converter(name, value) : value;
    if (v !== undefined)
      super.set(name, v);
    else super.delete(name);
    return this;
  }

  /**
   *
   * @param {Object} obj
   */
  setAll(obj) {
    if (typeof obj !== 'object' || Array.isArray(obj))
      throw new ArgumentError('You must provide Object instance');
    Object.keys(obj).forEach(n => {
      this.set(n, obj[n]);
    });
  }

}

module.exports = XMap;
