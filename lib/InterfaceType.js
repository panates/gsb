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

class InterfaceType extends Type {

  /**
   * @param {Schema} schema
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   * @override
   */
  constructor(schema, name, cfg) {
    super(schema, name, cfg);
    this._kind = 'interface';
    this._fields = new XMap((n, v) => new ObjectField(this, n, v));
    this.extends = cfg.extends;
    this.resolveType = cfg.resolveType;
    if (cfg.fields)
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
   * @return {Function}
   */
  get resolveType() {
    return this._resolveType;
  }

  /**
   *
   * @param {Function} fn
   */
  set resolveType(fn) {
    this._resolveType = fn;
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
    if (this.resolveType)
      out.resolveType = this.resolveType;
    /* istanbul ignore else */
    if (this.fields.size) {
      out.fields = {};
      for (const [n, f] of this.fields.entries()) {
        out.fields[n] = f.toJSON();
      }
    }
    return out;
  }

}

module.exports = InterfaceType;
