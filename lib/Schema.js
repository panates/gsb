/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ErrorEx, ArgumentError, SchemaError} = require('./errors');
const isplainobject = require('putil-isplainobject');
const EnumType = require('./EnumType');
const InputObjectType = require('./InputObjectType');
const InterfaceType = require('./InterfaceType');
const ObjectType = require('./ObjectType');
const ScalarType = require('./ScalarType');
const generateGraphQLSchema = require('./generator');
const {makeArray} = require('./helpers');
const {
  exportSchema,
  EXPORT_GSB,
  EXPORT_GQL_SIMPLE,
  EXPORT_GQL_PURE
} = require('./exporter');

class Schema {

  /**
   * @param {Object} [def]
   */
  constructor(def) {
    this._types = new Map();
    this._calls = new Map();
    this._links = new Map();
    if (def)
      this._loadDef(def);
  }

  get items() {
    return this._types;
  }

  get calls() {
    return this._calls;
  }

  get links() {
    return this._links;
  }

  getType(typeName) {
    const v = this.items.get(typeName);
    if (!v)
      throw new ErrorEx('Type "%s" not found in schema', typeName);
    return v;
  }

  getCall(name, deep) {
    const v = this.calls.get(name);
    if (!v) {
      if (deep) {
        for (const sch of this._links.values()) {
          const v = sch.getCall(name, deep);
          if (v)
            return v;
        }
      }
      throw new ErrorEx('Call "%s" not found in schema', name);
    }
    return v;
  }

  addEnumType(name, def) {
    if (this._types.get(name))
      throw new SchemaError('A type with same name (%s) already exists', name);
    this._types.set(name, new EnumType(this, name, def));
    return this;
  }

  addInputType(name, def) {
    if (this._types.get(name))
      throw new SchemaError('A type with same name (%s) already exists', name);
    this._types.set(name, new InputObjectType(this, name, def));
    return this;
  }

  addInterfaceType(name, def) {
    if (this._types.get(name))
      throw new SchemaError('A type with same name (%s) already exists', name);
    this._types.set(name, new InterfaceType(this, name, def));
    return this;
  }

  addObjectType(name, def) {
    if (this._types.get(name))
      throw new SchemaError('A type with same name (%s) already exists', name);
    this._types.set(name, new ObjectType(this, name, def));
    return this;
  }

  addScalarType(name, def) {
    if (this._types.get(name))
      throw new SchemaError('A type with same name (%s) already exists', name);
    this._types.set(name, new ScalarType(this, name, def));
    return this;
  }

  addCall(name, fn) {
    if (this._calls.get(name))
      throw new SchemaError('A resolver with same name (%s) already exists', name);
    if (typeof fn !== 'function')
      throw new SchemaError('You must provide function instance for resolver argument');
    this._calls.set(name, fn);
    return this;
  }

  link(namespace, schema) {
    if (this._links.has(namespace))
      throw new SchemaError('A schema with same name (%s) already linked', namespace);
    if (!(schema instanceof Schema))
      throw new SchemaError('You must provide Schema instance as second argument');
    if (schema === this)
      throw new SchemaError('Can\'t link self');
    this._links.set(namespace, schema);
    return this;
  }

  /**
   *
   * @param {Object} [options]
   * @param {Integer} [options.format]
   * @param {Function} [options.resolve]
   * @return {Object}
   */
  export(options) {
    return exportSchema(this, options);
  }

  /**
   *
   * @param {Object} [options]
   * @param {Function} [options.resolve]
   * @return {Object}
   */
  generate(options) {
    return generateGraphQLSchema(this, options);
  }

  /**
   *
   * @param {Object|String} def
   * @param {Object} [def.typeDefs]
   * @param {Object} [def.resolvers]
   * @param {Object} [def.calls]
   * @param {Function} [loadFn] Definition loader callback
   * @return {Promise}
   */
  load(def, loadFn) {

    if (!def)
      return Promise.resolve(null);

    if (!(isplainobject(def) || typeof def === 'string'))
      return Promise.reject(new ArgumentError('String or Object type required for first argument'));

    loadFn = loadFn || (v => v);
    const locationCache = {};

    const doLoad = async (schema, v) => {
      let obj;
      if (typeof v === 'string') {
        const m = await loadFn(v);
        obj = require(m);
      } else
        obj = v;
      if (!obj)
        return;

      if (typeof obj !== 'object')
        return Promise.reject(new ErrorEx(
            'Unable to load schema. %s returns %s except an Object instance', String(v), typeof obj));
      const links = makeArray(obj.link);
      for (let k = 0; k < links.length; k++) {
        const location = links[k];
        if (locationCache[location])
          continue;
        const sch = new Schema();
        sch.location = location;
        await doLoad(sch, location, loadFn);
        locationCache[location] = sch;
        this.link(location, sch);
      }
      if (typeof v === 'string')
        schema.location = v;
      schema._loadDef(obj);
    };

    return doLoad(this, def);
  }

  _loadDef(def) {
    if (def.typeDefs) {
      Object.getOwnPropertyNames(def.typeDefs).forEach(n => {
        const t = def.typeDefs[n];
        switch (t.kind) {
          case 'scalar': {
            this.addScalarType(n, t);
            break;
          }
          case 'enum': {
            this.addEnumType(n, t);
            break;
          }
          case 'interface': {
            this.addInterfaceType(n, t);
            break;
          }
          case 'object': {
            this.addObjectType(n, t);
            break;
          }
          case 'input': {
            this.addInputType(n, t);
            break;
          }
        }
      });
    }

    if (def.resolvers) {
      Object.getOwnPropertyNames(def.resolvers).forEach(n => {
        const t = this.getType(n);
        const rsvl = def.resolvers[n];
        switch (t.kind) {
          case 'scalar': {
            ['serialize', 'parseValue', 'parseLiteral'].forEach(n => {
              if (rsvl[n])
                t[n] = rsvl[n];
            });
            break;
          }
          case 'interface': {
            if (rsvl.__resolveType)
              t.resolveType = rsvl.__resolveType;
            break;
          }
          case 'object': {
            Object.getOwnPropertyNames(rsvl).forEach(n => {
              if (n === '__isTypeOf') {
                t.isTypeOf = rsvl[n];
                return;
              }
              if (t.fields.get(n))
                t.fields.get(n).resolve = rsvl[n];
            });
            break;
          }
        }
      });
    }

    if (def.calls) {
      Object.getOwnPropertyNames(def.calls).forEach(n => {
        if (typeof def.calls[n] === 'function')
          this.addCall(n, def.calls[n]);
      });

    }
  }

  toJSON() {
    return this.export();
  }

}

module.exports = Schema;

/** @const {Integer} */
Schema.EXPORT_GSB = EXPORT_GSB;
/** @const {Integer} */
Schema.EXPORT_GQL_SIMPLE = EXPORT_GQL_SIMPLE;
/** @const {Integer} */
Schema.EXPORT_GQL_PURE = EXPORT_GQL_PURE;
