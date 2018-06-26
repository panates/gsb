/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ArgumentError} = require('./errors');
const SchemaItem = require('./SchemaItem');
const {parseInputTypeString} = require('./helpers');

class InputObjectField extends SchemaItem {

  /**
   *
   * @param {ObjectField} field
   * @param {String} name
   * @param {Object|String} cfg
   * @constructor
   * @override
   */
  constructor(field, name, cfg) {
    super(field, name, cfg);
    if (typeof cfg === 'object') {
      /* istanbul ignore else */
      if (cfg.type) {
        const def = parseInputTypeString(String(cfg.type));
        this.type = def.type;
        this.list = def.list;
        this.nonNull = def.nonNull;
        this.nonNullItems = def.nonNullItems;
        this.defaultValue = def.defaultValue;
      }
      ['list', 'nonNull', 'nonNullItems', 'defaultValue', 'deprecationReason'].forEach(n => {
        if (cfg[n] !== undefined)
          this[n] = cfg[n];
      });
      this.deprecationReason = cfg.deprecationReason;
    } else {
      const def = parseInputTypeString(String(cfg));
      this.type = def.type;
      this.list = def.list;
      this.nonNull = def.nonNull;
      this.nonNullItems = def.nonNullItems;
      this.defaultValue = def.defaultValue;
    }
  }

  /**
   *
   * @return {*}
   */
  get defaultValue() {
    return this._defaultValue;
  }

  /**
   *
   * @param {*} value
   */
  set defaultValue(value) {
    this._defaultValue = value;
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
   * @return {Boolean}
   */
  get list() {
    return this._list;
  }

  /**
   *
   * @param {Boolean} value
   */
  set list(value) {
    this._list = value;
  }

  /**
   *
   * @return {Boolean}
   */
  get nonNull() {
    return this._nonNull;
  }

  /**
   *
   * @param {Boolean} value
   */
  set nonNull(value) {
    this._nonNull = value;
  }

  /**
   *
   * @return {Boolean}
   */
  get nonNullItems() {
    return this._nonNullItems;
  }

  /**
   *
   * @param {Boolean} value
   */
  set nonNullItems(value) {
    this._nonNullItems = value;
  }

  /**
   *
   * @return {String}
   */
  get type() {
    return this._type;
  }

  /**
   *
   * @param {String} value
   */
  set type(value) {
    this._type = value;
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
      throw new ArgumentError('Invalid argument name "%s"', value);
    super.name = value;
  }

  toJSON() {
    const out = {};
    /* istanbul ignore else */
    if (this.type)
      out.type = ((this.list ?
          ('[' + this.type + (this.nonNullItems ? '!' : '') +
              ']') : this.type)) + (this.nonNull ? '!' : '');
    if (this.description)
      out.description = this.description;
    if (this.deprecationReason)
      out.deprecationReason = this.deprecationReason;
    if (this.defaultValue !== undefined)
      out.defaultValue = this.defaultValue;
    return out;
  }

}

module.exports = InputObjectField;
