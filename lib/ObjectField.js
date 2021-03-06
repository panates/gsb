/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const SchemaItem = require('./SchemaItem');
const InputObjectField = require('./InputObjectField');
const FilterArg = require('./FilterArg');
const XMap = require('./XMap');
const {parseTypeString} = require('./helpers');
const {ArgumentError} = require('./errors');

const PROPERTIES = ['list', 'nonNull', 'nonNullItems', 'deprecationReason',
  'resolve'];

class ObjectField extends SchemaItem {

  /**
   *
   * @param {ObjectType|InterfaceType} owner
   * @param {String} name
   * @param {Object|String} cfg
   * @param {Object} [cfg.type]
   * @param {Object} [cfg.list]
   * @param {Object} [cfg.nonNull]
   * @param {Object} [cfg.nonNullItems]
   * @param {Object} [cfg.args]
   * @param {Object} [cfg.filter]
   * @param {Object} [cfg.where]
   * @param {Array<string>} [cfg.sort]
   * @param {number|boolean} [cfg.limit]
   * @param {number|boolean} [cfg.offset]
   * @constructor
   * @override
   */
  constructor(owner, name, cfg) {
    super(owner, name, cfg);
    this._args = new XMap((n, v) => new InputObjectField(this, n, v));

    if (!cfg)
      return;
    if (typeof cfg === 'object') {
      if (cfg.type) {
        const def = parseTypeString(String(cfg.type));
        this.type = def.type;
        this.list = def.list;
        this.nonNull = def.nonNull;
        this.nonNullItems = def.nonNullItems;
      }
      for (const n of PROPERTIES) {
        if (cfg[n] !== undefined)
          this[n] = cfg[n];
      }
      if (cfg.args)
        this._args.setAll(cfg.args);
      if (cfg.filter) {
        this._filter = new XMap((n, v) =>
            v ? new FilterArg(this, n, v) : undefined);
        this._filter.setAll(cfg.filter);
      } else if (cfg.where) {
        this._where = new XMap((n, v) =>
            v ? new FilterArg(this, n, v) : undefined);
        this._where.setAll(cfg.where);
      }
      if (Array.isArray(cfg.sort)) {
        for (const n of cfg.sort) {
          this._sort = this._sort || [];
          this._sort.push(n);
        }
      }
      if (cfg.limit != null)
        this._limit = parseInt(cfg.limit, 10) || true;
      if (cfg.offset != null)
        this._offset = parseInt(cfg.offset, 10) || true;
    } else {
      const def = parseTypeString(String(cfg));
      this.type = def.type;
      this.list = def.list;
      this.nonNull = def.nonNull;
      this.nonNullItems = def.nonNullItems;
    }
  }

  /**
   *
   * @return {XMap<InputObjectField>}
   */
  get args() {
    return this._args;
  }

  /**
   *
   * @return {XMap<FilterArg>}
   */
  get filter() {
    return this._filter || this._where;
  }

  /**
   *
   * @return {Array<String>}
   */
  get sort() {
    return this._sort;
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
   * @return {String|Function|Array<Function|String>}
   */
  get resolve() {
    return this._resolve;
  }

  /**
   *
   * @param {String|Function|Array<Function|String>} fn
   */
  set resolve(fn) {
    if (fn) {
      if (Array.isArray(fn))
        for (const i of fn) {
          if (!(typeof i === 'function' || typeof i === 'string'))
            throw new ArgumentError('Invalid field definition for "%s.%s".' +
                'You must provide String or Function values for "resolve" property',
                this._owner.name, this.name);
        }
      else if (!(typeof fn === 'function' || typeof fn === 'string'))
        throw new ArgumentError('Invalid field definition for "%s.%s".' +
            ' You must provide String or Function values for "resolve" property',
            this._owner.name, this.name);
    }
    this._resolve = fn;
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
      throw new ArgumentError('Invalid field name "%s"', value);
    this._name = value;
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

  toJSON() {
    const out = {};
    if (this.type)
      out.type = ((this.list ?
          ('[' + this.type + (this.nonNullItems ? '!' : '') +
              ']') : this.type)) + (this.nonNull ? '!' : '');
    if (this.description)
      out.description = this.description;
    if (this.deprecationReason)
      out.deprecationReason = this.deprecationReason;
    if (this.resolve)
      out.resolve = this.resolve;
    if (this.args.size) {
      out.args = {};
      for (const [n, f] of this.args.entries()) {
        out.args[n] = f.toJSON();
      }
    }
    if (this._filter && this._filter.size) {
      out.filter = {};
      for (const [n, f] of this._filter.entries()) {
        out.filter[n] = f.toJSON();
      }
    }
    if (this._where && this._where.size) {
      out.where = {};
      for (const [n, f] of this._where.entries()) {
        out.where[n] = f.toJSON();
      }
    }
    if (this.sort)
      out.sort = this.sort;
    if (this._limit != null)
      out.limit = this._limit;
    if (this._offset != null)
      out.offset = this._offset;
    return out;
  }

}

module.exports = ObjectField;
