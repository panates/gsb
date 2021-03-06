/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const Type = require('./Type');
const XMap = require('./XMap');
const ObjectField = require('./ObjectField');
const {makeArray} = require('./helpers');

/**
 *
 */
class ObjectType extends Type {

  /**
   * @param {Schema} schema
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   * @override
   */
  constructor(schema, name, cfg) {
    super(schema, name, cfg);
    this._kind = 'object';
    this._fields = new XMap((n, v) => new ObjectField(this, n, v));
    this.extends = cfg.extends;
    this.interfaces = cfg.interfaces;
    this.isTypeOf = cfg.isTypeOf;
    if (cfg && cfg.fields)
      this._fields.setAll(cfg.fields);
  }

  /**
   *
   * @return {String|Array<String>}
   */
  get extends() {
    return this._extends;
  }

  /**
   *
   * @param {String|Array<String>} v
   */
  set extends(v) {
    this._extends = v;
  }

  /**
   *
   * @return {String|Array<String>}
   */
  get interfaces() {
    return this._interfaces;
  }

  /**
   *
   * @param {String|Array<String>} v
   */
  set interfaces(v) {
    this._interfaces = v;
  }

  /**
   *
   * @return {Function|Array<Function>}
   */
  get isTypeOf() {
    return this._isTypeOf;
  }

  /**
   *
   * @param {Function|Array<Function>} fn
   */
  set isTypeOf(fn) {
    this._isTypeOf = fn;
  }

  /**
   *
   * @return {XMap<ObjectField>}
   */
  get fields() {
    return this._fields;
  }

  toJSON() {
    const out = super.toJSON();
    if (this.extends)
      out.extends = this.extends;
    if (this.interfaces)
      out.interfaces = makeArray(this.interfaces);
    if (this.isTypeOf)
      out.isTypeOf = this.isTypeOf;
    if (this.fields.size) {
      out.fields = {};
      for (const [n, f] of this.fields.entries()) {
        out.fields[n] = f.toJSON();
      }
    }
    return out;
  }

}

module.exports = ObjectType;
