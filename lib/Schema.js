/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const path = require('path');
const waterfall = require('putil-waterfall');
const merge = require('putil-merge');
const glob = require('glob');
const {ErrorEx, SchemaError, ArgumentError} = require('./errors');
const EnumType = require('./EnumType');
const InputObjectType = require('./InputObjectType');
const InterfaceType = require('./InterfaceType');
const ObjectType = require('./ObjectType');
const ScalarType = require('./ScalarType');
const generateGraphQLSchema = require('./generator');

const {
  exportSchema,
  EXPORT_GSB,
  EXPORT_GQL_SIMPLE,
  EXPORT_GQL_PURE
} = require('./exporter');

class Schema {

  /**
   * @param {string} [namespace]
   */
  constructor(namespace) {
    this._types = new Map();
    this._calls = new Map();
    this._links = new Map();
    this._root = null;
    this._namespace = namespace;
    this._location = null;
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

  get namespace() {
    return this._namespace;
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
    if (this.calls.get(name))
      throw new SchemaError('A resolver with same name (%s) already exists', name);
    if (typeof fn !== 'function')
      throw new SchemaError('You must provide function instance for resolver argument');
    this.calls.set(name, fn);
    return this;
  }

  link(schema) {
    if (!(schema && schema instanceof Schema))
      throw new TypeError('You must proivde a Schema instance');
    const sch = this.getSchema(schema.namespace);
    if (sch) {
      if (sch === this)
        throw new SchemaError('Can\'t link self');
      if (schema === sch)
        return;
      throw new SchemaError('A schema with same name (%s) already linked', schema.namespace);
    }
    if (schema === this)
      throw new SchemaError('Can\'t link self');
    this._links.set(schema.namespace, schema);
    return this;
  }

  getSchema(namespace, recursive) {
    if (this.namespace === namespace)
      return this;
    if (this._links.has(namespace))
      return this._links.get(namespace);
    /* istanbul ignore else */
    if (recursive) {
      /* perform recursive lookup */
      for (const sch of this._links.values()) {
        const result = sch.getSchema(namespace, recursive);
        /* istanbul ignore else */
        if (result)
          return result;
      }
    }
  }

  getType(name, recursive) {
    if (this._types.has(name))
      return this._types.get(name);
    /* istanbul ignore else */
    if (recursive) {
      /* perform recursive lookup */
      for (const sch of this._links.values()) {
        const result = sch.getType(name, recursive);
        /* istanbul ignore else */
        if (result)
          return result;
      }
    }
  }

  getCall(name, recursive) {
    if (this.calls.has(name))
      return this.calls.get(name);
    /* istanbul ignore else */
    if (recursive) {
      /* perform recursive lookup */
      for (const sch of this._links.values()) {
        const result = sch.getCall(name, recursive);
        /* istanbul ignore else */
        if (result)
          return result;
      }
    }
  }

  /**
   *
   * @param {Object} schemaDef
   * @param {Array<string>} [schemaDef.links]
   * @param {Object} [schemaDef.typeDefs]
   * @param {Object} [schemaDef.resolvers]
   * @param {Object} [schemaDef.calls]
   * @param {Object} [options]
   * @param {Function} [options.readFile]
   * @param {String} [options.rootPath]
   * @param {*} [context]
   * @return {Promise}
   */
  import(schemaDef, options, context) {
    return Promise.resolve().then(() => {
      if (!schemaDef) return;
      if (typeof schemaDef !== 'object')
        throw new ArgumentError('You must provide an object instance');

      const loadLinks = (links, ignoreReadFile) => {
        links = (Array.isArray(links) ? links : [links]);
        return waterfall.every(links, (next, lnk) => {
          return Promise.resolve(
              !ignoreReadFile && options && options.readFile ?
                  options.readFile(lnk, context) :
                  lnk)
              .then(lnk => {
                if (Array.isArray(lnk))
                  return loadLinks(lnk, true);

                if (typeof lnk === 'string') {
                  const currPath = (this._location &&
                      path.dirname(this._location)) || '';
                  const rootPath = (options && options.rootPath) ||
                      (this._root && this._root._location ?
                          /* istanbul ignore next */
                          path.dirname(this._root._location) : currPath);

                  if (lnk.startsWith('#'))
                    lnk = path.resolve(path.join(rootPath, lnk.substring(1)));
                  else if (!path.isAbsolute(lnk))
                    lnk = path.join(currPath || rootPath, lnk);

                  const files = glob.sync(lnk, {
                    cwd: '/', root: '/', realpath: true
                  });
                  if (!files.length)
                    files.push(lnk);

                  return waterfall.every(files, (next, f) => Schema._fromFile(
                      this._root || this, f, options, context)
                      .then(sch => this.link(sch))
                  );
                }

                /* istanbul ignore else */
                if (typeof lnk === 'function')
                  lnk = lnk(context);

                /* istanbul ignore else */
                if (typeof lnk === 'object') {
                  return Schema._fromObject(this._root ||
                      this, lnk, options, context);
                } else
                /* istanbul ignore next */
                  throw new ErrorEx('Invalid schema file "%s"', lnk);

              });

        });
      };

      /* Phase 1. Import links */
      return (schemaDef.links ? loadLinks(schemaDef.links) : Promise.resolve()
      ).then(() => {
        /* Phase 2. Process definition object */
        if (schemaDef.typeDefs) {
          Object.getOwnPropertyNames(schemaDef.typeDefs).forEach(n => {
            const t = schemaDef.typeDefs[n];
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

        if (schemaDef.resolvers) {
          Object.getOwnPropertyNames(schemaDef.resolvers).forEach(n => {
            const t = this.getType(n, false);
            if (!t)
              throw new ErrorEx('Unable add to resolver. Type "%s" not found in target', n);
            const rsvl = schemaDef.resolvers[n];
            switch (t.kind) {
              case 'scalar': {
                ['serialize', 'parseValue', 'parseLiteral'].forEach(n => {
                  if (rsvl[n])
                    t[n] = rsvl[n];
                });
                break;
              }
              case 'interface': {
                /* istanbul ignore else */
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

        if (schemaDef.calls) {
          Object.getOwnPropertyNames(schemaDef.calls).forEach(n => {
            if (typeof schemaDef.calls[n] === 'function')
              this.addCall(n, schemaDef.calls[n]);
          });
        }

      });

    });
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

  toJSON() {
    return this.export();
  }

  /**
   *
   * @param {string} filePath
   * @param {Object} [options]
   * @param {Function} [options.readFile]
   * @param {*} [context]
   * @return {Promise<Schema>}
   * @static
   */
  static fromFile(filePath, options, context) {
    return this._fromFile(null, filePath, options, context);
  }

  /**
   *
   * @param {Object} def
   * @param {Object} [options]
   * @param {Function} [options.readFile]
   * @param {*} [context]
   * @return {Promise<Schema>}
   * @static
   */
  static fromObject(def, options, context) {
    return this._fromObject(null, def, options, context);
  }

  /**
   *
   * @param {Schema} [rootSchema]
   * @param {string} filePath
   * @param {Object} options
   * @param {Function} [options.readFile]
   * @param {*} [context]
   * @return {Promise<Schema>}
   * @private
   * @static
   */
  static _fromFile(rootSchema, filePath, options, context) {
    return Promise.resolve().then(() => {
      if (typeof filePath !== 'string')
        throw new Error('You must provide file path');

      const fullPath =
          (!path.isAbsolute(filePath) && rootSchema &&
              rootSchema._location) ?
              /* istanbul ignore next */
              path.resolve(rootSchema._location, filePath) : path.resolve(filePath);

      let obj = require(fullPath);

      if (typeof obj === 'function')
        obj = obj(context);

      if (typeof obj !== 'object')
        throw new ErrorEx('Can\'t load schema file "%s". This file does not export an object instance', fullPath);

      obj.location = fullPath;

      return this._fromObject(rootSchema, obj, options, context);
    });

  }

  /**
   *
   * @param {Schema} [rootSchema]
   * @param {Object} obj
   * @param {Object} options
   * @param {*} [context]
   * @return {Promise<Schema>}
   * @private
   * @static
   */
  static _fromObject(rootSchema, obj, options, context) {
    return Promise.resolve().then(() => {
      if (typeof obj !== 'object')
        throw new Error('You must provide an object instance');

      if (!(options && options.__cache)) {
        options = (options && merge.clone(options)) || {};
        options.__cache = {};
      }

      if (!obj.namespace)
      /* istanbul ignore next */
        if (obj.location)
          throw new ErrorEx('No "namespace" property in schema file "%s"', obj.location);
        else
          throw new ErrorEx('No "namespace" property in schema');

      if (options.__cache[obj.namespace])
        return options.__cache[obj.namespace];

      const schema = new Schema(obj.namespace);
      schema._root = rootSchema;
      if (obj.location)
        schema._location = obj.location;
      options.__cache[obj.namespace] = schema;
      return schema.import(obj, options, context).then(() => schema);
    });
  }
}

module.exports = Schema;

/** @const {Integer} */
Schema.EXPORT_GSB = EXPORT_GSB;
/** @const {Integer} */
Schema.EXPORT_GQL_SIMPLE = EXPORT_GQL_SIMPLE;
/** @const {Integer} */
Schema.EXPORT_GQL_PURE = EXPORT_GQL_PURE;
