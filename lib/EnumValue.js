/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ArgumentError} = require('./errors');
const SchemaItem = require('./SchemaItem');

/**
 * @class
 */
class EnumValue extends SchemaItem {

  /**
   *
   * @param {EnumType} owner
   * @param {String} name
   * @param {Object|*} def
   * @constructor
   * @override
   */
  constructor(owner, name, def) {
    super(owner, name, def);
    if (typeof def === 'object') {
      if (def.deprecationReason)
        this.deprecationReason = def.deprecationReason;
      this.value = def.value;
    } else
      this.value = def;
  }

  /**
   *
   * @return {String}
   */
  get deprecationReason() {
    return this._deprecationReason;
  }

  /**
   *
   * @param {String} value
   */
  set deprecationReason(value) {
    this._deprecationReason = value;
  }

  /**
   *
   * @return {String}
   */
  get name() {
    return super.name;
  }

  /**
   *
   * @param {String} value
   * @override
   */
  set name(value) {
    if (typeof value !== 'string' ||
        !value.match(/^([A-Za-z])+\w*$/))
      throw new ArgumentError('Invalid enum value name "%s"', value);
    this._name = value;
  }

  /**
   *
   * @return {*}
   */
  get value() {
    return this._value;
  }

  /**
   *
   * @param {*} value
   */
  set value(value) {
    this._value = value;
  }

  toJSON() {
    const out = {
      value: this.value
    };
    if (this.description)
      out.description = this.description;
    if (this.deprecationReason)
      out.deprecationReason = this.deprecationReason;
    return out;
  }

}

module.exports = EnumValue;
