/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const caller = require('caller');
const path = require('path');
const fs = require('fs');
const {ErrorEx, SchemaError} = require('./errors');
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

  get defaultLoader() {
    return this._defaultLoader;
  }

  set defaultLoader(v) {
    this._defaultLoader = v;
  }

  getType(typeName) {
    const v = this.items.get(typeName);
    if (!v)
      throw new ErrorEx('Type "%s" not found in schema', typeName);
    return v;
  }

  getCall(name, deep) {

    const _get = (schema, n) => {
      const v = schema.calls.get(name);
      if (v)
        return v;
      if (deep) {
        for (const sch of schema._links.values()) {
          const v = _get(sch, name);
          if (v)
            return v;
        }
      }
    };
    const v = _get(this, name);
    if (!v)
      throw new ErrorEx('Call "%s" not found in schema', name);
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
    namespace = this._normalizeNamespace(namespace);
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
   * @param {Object} options
   * @param {Object} [def.typeDefs]
   * @param {Object} [def.resolvers]
   * @param {Object} [def.calls]
   * @param {Function} [loadFn] Definition loader callback
   * @return {Promise}
   */
  load(def, options, loadFn) {

    if (!def)
      return Promise.resolve(null);

    if (typeof options === 'function') {
      loadFn = options;
      options = null;
    }
    options = options || {};
    options.rootPath = path.isAbsolute(options.rootPath) ? options.rootPath :
        path.resolve(path.dirname(caller()), options.rootPath);

    this.namespace =
        (typeof def === 'string') ? this._normalizeNamespace(def) : '';

    const nsCache = {};

    const doLoad = async (schema, v, currentNs) => {
      if (!v) return;
      let obj = v;
      try {
        if (typeof v === 'string') {
          obj = loadFn ? await loadFn(v, schema, options) :
              await this._mapFile(v, schema, options);
          if (typeof obj === 'string') {
            obj = require(obj);
            return doLoad(schema, obj, currentNs);
          }
        }

        if (typeof obj === 'function')
          obj = obj.call(null, options);

        if (typeof obj !== 'object')
          return Promise.reject(new ErrorEx(
              'Unable to load schema. %s returns %s except an Object instance', String(v), typeof obj));

        this._beforeLoad(obj, schema, options);
        schema._loadDef(obj);

        const links = makeArray(obj.link);
        for (let namespace of links) {
          if (typeof namespace !== 'string')
            return Promise.reject(new Error('Only string type allowed in "link" property'));
          namespace = this._normalizeNamespace(namespace);

          if (nsCache[namespace]) {
            schema.link(namespace, nsCache[namespace]);
            continue;
          }

          const sch = new Schema();
          sch.namespace = namespace;
          nsCache[namespace] = sch;
          schema.link(namespace, sch);
          await doLoad(sch, namespace, schema.namespace);
        }

      } catch (e) {
        return Promise.reject(e);
      }

    };

    return doLoad(this, def, this.namespace);
  }

  toJSON() {
    return this.export();
  }

  /**
   *
   * @param {Object} def
   * @protected
   */
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

  // noinspection JSMethodCanBeStatic
  /**
   *
   * @param {Object} def
   * @param {Schema} schema
   * @param {Object} options
   * @protected
   */
  _beforeLoad(def, schema, options) {
    if (def.link) {
      const a = Array.isArray(def.link) ? def.link : [def.link];
      const b = [];
      const nsPath = schema.namespace ? path.dirname(schema.namespace) : '';
      const rootDir = path.isAbsolute(nsPath) && !nsPath.match(/^[\\/].+$/) ?
          nsPath : path.resolve(options.rootPath, './' + nsPath);

      for (const lnk of a) {
        const lnkDir = path.dirname(lnk);
        if (path.basename(lnk) === '*') {
          const dir = path.resolve(rootDir, lnkDir);
          const files = fs.readdirSync(dir);
          for (let i = 0; i < files.length; i++) {
            const f = this._normalizeNamespace(path.join(nsPath, lnkDir,
                path.basename(files[i], path.extname(files[i]))));
            if (b.indexOf(f) < 0)
              b.push(f);
          }
        } else {
          b.push(path.isAbsolute(lnk) ? lnk : path.join(nsPath, lnk));
        }
      }
      def.link = b;
    }
  }

  // noinspection JSMethodCanBeStatic
  /**
   *
   * @param {String} namespace
   * @param {Schema} schema
   * @param {Object} options
   * @return {String|Object}
   * @protected
   */
  _mapFile(namespace, schema, options) {
    return path.isAbsolute(namespace) && !namespace.match(/^[\\/].+$/) ?
        namespace : path.resolve(options.rootPath, './' + namespace);
  }

  // noinspection JSMethodCanBeStatic
  /**
   *
   * @param {String} ns
   * @return {string}
   * @private
   */
  _normalizeNamespace(ns) {
    if (!ns) return;
    return String(ns).replace(/\\/g, '/');
  }

}

module.exports = Schema;

/** @const {Integer} */
Schema.EXPORT_GSB = EXPORT_GSB;
/** @const {Integer} */
Schema.EXPORT_GQL_SIMPLE = EXPORT_GQL_SIMPLE;
/** @const {Integer} */
Schema.EXPORT_GQL_PURE = EXPORT_GQL_PURE;
