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
 * @abstract
 */
class Type extends SchemaItem {

  /**
   * @param {Schema} owner
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   * @override
   */
  constructor(owner, name, cfg) {
    super(owner, name, cfg);
    if (cfg && typeof cfg !== 'object')
      throw new ArgumentError('You must provide configuration object');
    this._kind = null;
    if (typeof cfg === 'object')
      this.extension = cfg.extension;
  }

  /**
   *
   * @return {Schema}
   */
  get owner() {
    return this._owner;
  }

  /**
   *
   * @return {String}
   */
  get kind() {
    return this._kind;
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
      throw new ArgumentError('Invalid type name "%s"', value);
    super.name = value;
  }

  toJSON() {
    const out = {
      kind: this.kind
    };
    if (this.description)
      out.description = this.description;
    if (this.extension)
      out.extension = !!this.extension;
    return out;
  }

  toString() {
    return '[object ' + this.constructor.name + '<' + this.name + '>]';
  }

}

module.exports = Type;
