/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ArgumentError} = require('./errors');
const SchemaItem = require('./SchemaItem');
const {parseTypeString} = require('./helpers');

const OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'btw', 'nbtw',
  'in', 'nin', 'is', 'not', 'like', 'nlike', 'ilike', 'nilike'];

class FilterArg extends SchemaItem {

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
      const def = parseTypeString(String(cfg.type));
      this.type = def.type;
      ['list', 'nonNull', 'nonNullItems', 'deprecationReason',
        'resolve'].forEach(n => {
        if (cfg[n] !== undefined)
          this[n] = cfg[n];
      });
      if (Array.isArray(cfg.op)) {
        this.op = [];
        cfg.op.forEach(i => {
          if (OPS.indexOf(i) >= 0) {
            this.op = this.op || [];
            this.op.push(i);
          }
        });
      }
      this.deprecationReason = cfg.deprecationReason;
    } else {
      const def = parseTypeString(String(cfg));
      this.type = def.type;
    }
    if (!this.op)
      this.op = ['eq'];
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
    out.type = ((this.list ?
        ('[' + this.type + (this.nonNullItems ? '!' : '') +
            ']') : this.type)) + (this.nonNull ? '!' : '');
    out.op = this.op;
    if (this.description)
      out.description = this.description;
    if (this.deprecationReason)
      out.deprecationReason = this.deprecationReason;
    return out;
  }

}

module.exports = FilterArg;
