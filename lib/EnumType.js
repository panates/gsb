/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const Type = require('./Type');
const EnumValue = require('./EnumValue');
const XMap = require('./XMap');

class EnumType extends Type {

  /**
   * @param {Schema} owner
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   * @override
   */
  constructor(owner, name, cfg) {
    super(owner, name, cfg);
    this._kind = 'enum';
    this.extends = cfg.extends;
    this._values = new XMap((n, v) => {
      return new EnumValue(this, n, v);
    });
    if (cfg && cfg.values)
      this._values.setAll(cfg.values);
  }

  /**
   *
   * @return {XMap<EnumValue>}
   */
  get values() {
    return this._values;
  }

  toJSON() {
    const out = super.toJSON();
    if (this.extends)
      out.extends = this.extends;
    /* istanbul ignore else */
    if (this.values.size) {
      out.values = {};
      for (const [n, f] of this.values.entries()) {
        out.values[n] = f.toJSON();
      }
    }
    return out;
  }

}

module.exports = EnumType;
