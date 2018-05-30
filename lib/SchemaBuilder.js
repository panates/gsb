/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/


/**
 * Module dependencies.
 * @private
 */
const SchemaError = require('./SchemaError');
const {
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLInt, GraphQLFloat, GraphQLString, GraphQLBoolean, GraphQLID
} = require('graphql');
const merge = require('putil-merge');
const promisify = require('putil-promisify');
const waterfall = require('putil-waterfall');
const isPlainObject = require('putil-isplainobject');
const {walkdirSync} = require('putil-walkdir');
const path = require('path');
const fs = require('fs');
const getQuery = require('./getQuery');

/**
 * @class
 */
class SchemaBuilder {
  constructor() {
    this._types = {};
    this._resolvers = {};
    this._extends = [];
    this.type('Query', {
      fields: {}
    });
    this.type('Mutation', {
      fields: {}
    });
  }

  enum(name, config) {
    if (this._types[name])
      throw new SchemaError('A Type with same name "%s" already exists', name);
    if (!config.values)
      throw new SchemaError('You must provide values to create object type');

    const obj = {
      type: 'Enum',
      name,
      values: {},
      description: config.description
    };
    this._extendEnumValues(obj, config.values);
    this._types[name] = obj;
  }

  interface(name, config) {
    if (this._types[name])
      throw new SchemaError('A Type with same name "%s" already exists', name);
    if (!config.fields)
      throw new SchemaError('You must provide fields to create object type');

    const obj = {
      type: 'Interface',
      name,
      fields: {},
      resolveType: config.resolveType,
      description: config.description
    };
    this._extendObjectFields(obj, config.fields);
    this._types[name] = obj;
  }

  type(name, config) {
    if (this._types[name])
      throw new SchemaError('A Type with same name "%s" already exists', name);
    config = config || {};
    const obj = {
      type: 'Object',
      name,
      interfaces: [],
      fields: {},
      isTypeOf: config.isTypeOf,
      description: config.description
    };
    if (config.interfaces)
      this._extendObjectInterfaces(obj, config.interfaces);
    if (config.fields)
      this._extendObjectFields(obj, config.fields);
    this._types[name] = obj;
  }

  input(name, config) {
    if (this._types[name])
      throw new SchemaError('A Type with same name "%s" already exists', name);
    if (!config.fields)
      throw new SchemaError('You must provide fields to create input object type');
    const obj = {
      type: 'Input',
      name,
      fields: {},
      description: config.description
    };
    this._extendInputFields(obj, config.fields);
    this._types[name] = obj;
  }

  scalar(name, config) {
    if (this._types[name])
      throw new SchemaError('A Type with same name "%s" already exists', name);
    this._types[name] = {
      type: 'Scalar',
      name,
      description: config.description,
      serialize: config.serialize,
      parseValue: config.parseValue,
      parseLiteral: config.parseLiteral
    };
  }

  list(name, config) {
    config = config || {};
    const result = {
      type: '[' + config.type + ']',
      description: config.description,
      deprecationReason: config.deprecationReason,
      args: {}
    };
    if (config.filter) {
      const filterName = name + 'Filter';
      const fields = {
        and: '[' + filterName + '!]',
        or: '[' + filterName + '!]'
      };
      Object.getOwnPropertyNames(config.filter).forEach(n => {
        let v = config.filter[n];
        if (typeof v === 'string')
          v = {type: v};
        else if (!isPlainObject(v))
          throw new SchemaError('You must provide String or Object value');
        if (!v.type)
          throw new SchemaError('You must provide "type" property');
        v.op = v.op || ['eq'];
        v.op = Array.isArray(v.op) ? v.op : [v.op];
        v.op.forEach(op => {
          fields[n + '_' + op] = ['in', 'nin', 'between', 'btw',
            'notBetween', 'nbtw'].includes(op) ?
              '[' + v.type + '!]' : v.type;
        });
      });
      this.input(filterName, {
        fields
      });
      result.args.filter = {type: filterName};
    }
    if (config.orderBy) {
      const orderBy = Array.isArray(config.orderBy) ? config.orderBy :
          [config.orderBy];
      const fields = {};
      orderBy.forEach(n => {
        fields[n] = 'SortOrder';
      });
      this.input(name + 'Order', {
        fields: fields
      });
      result.args.orderBy = {type: name + 'Order'};
    }
    if (config.limit !== false)
      result.args.limit = {type: 'Int', defaultValue: 10};
    if (config.offset !== false)
      result.args.offset = {type: 'Int'};
    result.resolve = config.resolve;
    return result;
  }

  resolver(name, fn) {
    if (!fn && this._resolvers[name])
      return this._resolvers[name];
    if (this._resolvers[name])
      throw new SchemaError('A Resolver with same name "%s" already exists', name);
    if (typeof fn !== 'function')
      throw new SchemaError('Function type needed for calls', name);
    this._resolvers[name] = fn;
  }

  extend(name, config) {
    this._extends.push({
      name,
      config
    });
  }

  scanBundles(bundles, ctx) {
    /* Convert object to array */
    if (!Array.isArray(bundles)) {
      const a = [];
      Object.getOwnPropertyNames(bundles).forEach(n => {
        a.push(bundles[n]);
      });
      bundles = a;
    }
    const loadFile = (f) => {
      if (path.extname(f) !== '.js')
        return;
      const fs = require(f);
      fs(this, ctx);
    };
    bundles.forEach(bundle => {
      if (!bundle.metaData.apiSchema)
        return;
      const f = path.resolve(bundle.dirname, bundle.metaData.apiSchema);
      const stats = fs.statSync(f);
      if (stats.isFile())
        return loadFile(f);

      if (stats.isDirectory()) {
        walkdirSync(f, (f) => {
          return loadFile(f);
        });

      }
    });
  }

  generate() {
    const typeMap = merge.deep({}, this._types);
    const self = this;

    this._extends.forEach((o) => {
      const typ = typeMap[o.name];
      if (!typ)
        throw new SchemaError('Can\'t extend type. Base type "%s" not found', o.name);
      if (typ.type === 'object') {
        if (o.config.interfaces)
          this._extendObjectInterfaces(typ, o.config.interfaces);
        if (o.config.fields)
          this._extendObjectFields(typ, o.config.fields);
      } else if (typ.type === 'enum') {
        this._extendEnumValues(typ, o.config.values);
      }
    });

    const gqlTypes = {};

    function getGraphQLType(typeName) {
      if (gqlTypes[typeName])
        return gqlTypes[typeName];
      if (typeName === 'String')
        return GraphQLString;
      else if (typeName === 'Int')
        return GraphQLInt;
      else if (typeName === 'Boolean')
        return GraphQLBoolean;
      else if (typeName === 'Float')
        return GraphQLFloat;
      else if (typeName === 'ID')
        return GraphQLID;
    }

    function createGraphQLInterfaceType(def) {
      if (!Object.getOwnPropertyNames(def.fields).length)
        return;
      return new GraphQLInterfaceType({
        name: def.name,
        fields: () => createObjectFields(def.name, def.fields),
        description: def.description
      });
    }

    function createGraphQLObjectType(def) {
      if (!Object.getOwnPropertyNames(def.fields).length)
        return;
      return new GraphQLObjectType({
        name: def.name,
        fields: () => createObjectFields(def.name, def.fields),
        interfaces: () => {
          if (!(def.interfaces && def.interfaces.length))
            return;
          const result = [];
          def.interfaces.forEach(i => {
            result.push(getGraphQLType(i));
          });
          return result;
        },
        /*isTypeOf: (value) => {
          if (def.isTypeOf)
            return def.isTypeOf.apply(null, arguments);
          return true;
        },*/
        description: def.description
      });
    }

    function createObjectFields(objName, fields) {
      const keys = Object.getOwnPropertyNames(fields);
      if (!keys.length)
        return;
      const result = {};
      keys.forEach(n => {
        const f = fields[n];
        let typ = getGraphQLType(f.type);
        if (!typ)
          throw new SchemaError('Unable to initialize field "%s.%s". Type "%s" not found', objName, n, f.type);
        if (f.list) {
          if (f.nonNullItems)
            typ = new GraphQLNonNull(typ);
          typ = new GraphQLList(typ);
        }
        if (f.nonNull)
          typ = new GraphQLNonNull(typ);
        const args = {};
        if (f.args) {
          Object.getOwnPropertyNames(f.args).forEach(m => {
            const a = f.args[m];
            let t = getGraphQLType(a.type);
            if (!t)
              throw new SchemaError('Unable to initialize argument "%s.%s(%s)". Type "%s" not found',
                  objName, n, m, a.type);
            if (a.nonNull)
              t = new GraphQLNonNull(t);
            args[m] = {
              type: t,
              defaultValue: a.defaultValue,
              description: a.description
            };
          });
        }

        /* Wrap resolver */
        let resolve;
        if (f.resolve) {
          const resolveArr = Array.isArray(f.resolve) ? f.resolve : [f.resolve];
          /* First resolver is for wrapping info argument */
          resolveArr.unshift((parent, args, ctx, info) => {
            info.getQuery = () => {
              return getQuery(info);
            };
          });
          resolve = function() {
            const args = arguments;
            return promisify.fromCallback((cb) => {
              //return cb(null, true);
              waterfall.every(resolveArr, (next, fn) => {
                if (typeof fn === 'string') {
                  const r = self._resolvers[fn];
                  if (!r)
                    throw new SchemaError('Resolver "%s" not found', r);
                  fn = r;
                }
                if (typeof fn !== 'function')
                  throw new SchemaError('You must provide String or Function type for "resolve" property');
                const x = fn(...args);
                if (promisify.isPromise(x)) {
                  x.then(value => {
                    if (x !== undefined)
                      return cb(null, value);
                    next(null, value);
                  }, (reason => {
                    next(reason);
                  }));
                  return;
                }
                if (x !== undefined)
                  return cb(null, x);
                next(null, x);
              }, cb);
            });
          };
        }

        result[n] = {
          type: typ,
          description: f.description,
          deprecationReason: f.deprecationReason,
          args,
          resolve
        };
      });
      return result;
    }

    function createGraphQLInputObjectType(def) {
      if (!Object.getOwnPropertyNames(def.fields).length)
        return;
      return new GraphQLInputObjectType({
        name: def.name,
        fields: () => createInputObjectFields(def.name, def.fields),
        description: def.description
      });
    }

    function createInputObjectFields(objName, fields) {
      const keys = Object.getOwnPropertyNames(fields);
      if (!keys.length)
        return;
      const result = {};
      keys.forEach(n => {
        const f = fields[n];
        let typ = getGraphQLType(f.type);
        if (!typ)
          throw new SchemaError('Unable to initialize "%s.%s". Type "%s" not found', objName, n, f.type);
        if (f.list) {
          if (f.nonNullItems)
            typ = new GraphQLNonNull(typ);
          typ = new GraphQLList(typ);
        }
        if (f.nonNull)
          typ = new GraphQLNonNull(typ);
        result[n] = {
          type: typ,
          description: f.description,
          deprecationReason: f.deprecationReason
        };
      });
      return result;
    }

    Object.getOwnPropertyNames(typeMap).forEach(n => {
      switch (typeMap[n].type) {
        case 'Scalar': {
          gqlTypes[n] = new GraphQLScalarType(typeMap[n]);
          break;
        }
        case 'Enum': {
          gqlTypes[n] = new GraphQLEnumType(typeMap[n]);
          break;
        }
        case 'Interface': {
          const typ = createGraphQLInterfaceType(typeMap[n]);
          if (typ)
            gqlTypes[n] = typ;
          break;
        }
        case 'Object': {
          const typ = createGraphQLObjectType(typeMap[n]);
          if (typ)
            gqlTypes[n] = typ;
          break;
        }
        case 'Input': {
          const typ = createGraphQLInputObjectType(typeMap[n]);
          if (typ)
            gqlTypes[n] = typ;
          break;
        }
      }
    });

    const cfg = {
      query: gqlTypes.Query
    };
    if (Object.getOwnPropertyNames(typeMap.Mutation.fields).length)
      cfg.mutation = gqlTypes.Mutation;
    return new GraphQLSchema(cfg);
  }

  _extendObjectFields(obj, fields) {
    Object.getOwnPropertyNames(fields).forEach((n) => {
      if (obj.fields[n])
        throw new SchemaError('Can not extend type "%s". A field with same name "%s" already exists', obj.name, n);

      const f = fields[n];

      /* Simple type referencing */
      if (typeof f === 'string') {
        obj.fields[n] = this._parseTypeString(f);
        return;
      }
      if (typeof f.type !== 'string')
        throw new SchemaError('"type" property is not defined');

      const def = this._parseTypeString(f.type);
      def.resolve = f.resolve;
      def.deprecationReason = f.deprecationReason;
      def.description = f.description;

      /* Build arguments map */
      if (f.args) {
        if (typeof f.args !== 'object')
          throw new SchemaError('Invalid property value for "args"');
        Object.getOwnPropertyNames(f.args).forEach((n) => {
          def.args = def.args || {};
          const arg = f.args[n];
          if (typeof arg === 'string') {
            def.args[n] = this._parseTypeString(arg);
            return;
          }
          if (!arg.type)
            throw new SchemaError('%s.%s field definition is not valid. You must provide argument type', obj.name, n);
          const x = this._parseTypeString(arg.type);
          x.defaultValue = arg.defaultValue;
          x.description = arg.description;
          def.args[n] = x;
        });
      }
      obj.fields[n] = def;
    });
  }

  _extendInputFields(obj, fields) {
    Object.getOwnPropertyNames(fields).forEach((n) => {
      if (obj.fields[n])
        throw new SchemaError('Can not extend input type "%s". A field with same name "%s" already exists', obj.name, n);

      const f = fields[n];

      /* Simple type referencing */
      if (typeof f === 'string') {
        obj.fields[n] = this._parseTypeString(f);
        return;
      }
      if (typeof f.type !== 'string')
        throw new SchemaError('"type" property is not defined');
      const def = this._parseTypeString(f.type);
      def.defaultValue = f.defaultValue;
      def.description = f.description;
      obj.fields[n] = def;
    });
  }

  _extendObjectInterfaces(obj, interfaces) {
    if (!interfaces)
      return;
    const a = (Array.isArray(interfaces) ? interfaces : [interfaces]);
    a.forEach((x) => {
      if (obj.interfaces.indexOf(x) < 0)
        obj.interfaces.push(x);
    });
  }

  _extendEnumValues(obj, values) {
    if (!values)
      return;
    Object.getOwnPropertyNames(values).forEach(n => {
      if (obj.values[n])
        throw new SchemaError('Enum type "%s" already has an item "%"', obj.name, n);
      obj.values[n] = (typeof values[n] === 'object') ?
          values[n] : {value: values[n]};
    });
  }

  // noinspection JSMethodCanBeStatic
  _parseTypeString(s) {
    const m = s.match(/(?:(\w+)|(?:\[(\w+)(!)?]))(!)?/);
    if (!m)
      throw new SchemaError('"%s" is not a valid type definition', s);
    const t = {type: m[1] || m[2]};
    if (m[2]) t.list = true;
    if (m[3]) t.nonNullItems = true;
    if (m[4]) t.nonNull = true;
    return t;
  }
}

/**
 * Expose `SchemaBuilder`.
 */
module.exports = SchemaBuilder;
