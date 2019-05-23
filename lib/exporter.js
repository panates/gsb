/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {ErrorEx, SchemaError} = require('./errors');
const {makeArray, mergeCalls} = require('./helpers');
const waterfall = require('putil-waterfall');
const promisify = require('putil-promisify');
const merge = require('putil-merge');

/** @const {Integer} */
const EXPORT_GSB = 'GSB';
/** @const {Integer} */
const EXPORT_GQL = 'GRAPHQL';
/** @const {Integer} */
const EXPORT_GQL_PURE = 'GRAPHQL_PURE';

const BASE_TYPES = ['scalar', 'enum', 'interface', 'input', 'object'];

function exportSchema(rootSchema, options = {}) {
  const target = {};
  options.format = options.format || EXPORT_GSB;
  const exportedItems = new Set();
  return doExportSchema(
      target,
      rootSchema,
      rootSchema,
      options,
      exportedItems
  );
}

function doExportSchema(target, rootSchema, schema, options, exportedItems) {

  function exportType(typ) {
    if (exportedItems.has(typ))
      return;

    const getExportTarget = () => {
      exportedItems.add(typ);
      target.typeDefs = target.typeDefs || {};
      const o = target.typeDefs[typ.name] || {kind: typ.kind};
      target.typeDefs[typ.name] = o;
      return o;
    };

    const exportEnumType = () => {
      const o = getExportTarget();
      const copyFrom = (src) => {
        if (src.description)
          o.description = src.description;
        if (src.values) {
          o.values = o.values || {};
          Object.assign(o.values, src.values);
          for (const v of Object.keys(o.values))
            o.values[v].value = o.values[v].value || v;
        }
      };
      extendType((src) => copyFrom(src));
      copyFrom(typ.toJSON());
      return o;
    };

    const exportScalarType = () => {
      const o = getExportTarget();
      Object.assign(o, typ.toJSON());
      return o;
    };

    const exportInterfaceType = () => {
      const o = getExportTarget();
      const copyFrom = (src) => {
        if (src.description)
          o.description = src.description;
        if (src.resolveType)
          o.resolveType = src.resolveType;
        if (src.fields) {
          o.fields = o.fields || {};
          exportObjectFields(src.fields, o.fields);
        }
      };
      if (typ.extends)
        extendType((src) => copyFrom(src));
      copyFrom(typ.toJSON());
      return o;
    };

    const exportObjectType = () => {
      const o = getExportTarget();
      const copyFrom = (src) => {
        if (src.description)
          o.description = src.description;
        if (src.interfaces) {
          o.interfaces = makeArray(o.interfaces, src.interfaces);
          for (const i of o.interfaces) {
            const intf = target.typeDefs[i];
            // Define interface fields to object
            /* istanbul ignore else */
            if (intf) {
              o.fields = o.fields || {};
              merge(o.fields, intf.fields, {deep: true, adjunct: true});
            }
          }
        }
        if (src.isTypeOf)
          o.isTypeOf = makeArray(src.isTypeOf);
        if (src.fields) {
          o.fields = o.fields || {};
          exportObjectFields(src.fields, o.fields);
        }
      };
      if (typ.extends)
        extendType((src) => copyFrom(src));
      copyFrom(typ.toJSON());
      return o;
    };

    const exportObjectFields = (srcFields, dstFields) => {
      for (const n of Object.keys(srcFields)) {
        const src = srcFields[n];
        const dst = dstFields[n] = dstFields[n] || {};
        Object.assign(dst, src);
        if (typ.kind === 'object') {

          const filterField = src.filter ? 'filter' :
              (src.where ? 'where' : null);

          if (src[filterField]) {
            delete dst[filterField];
            // Create new input type for filter
            const nm = '_' + typ.name + '_' + n + '_Filter';
            dst.args = dst.args || {};
            dst.args[filterField] = {type: nm};
            const o = {
              kind: 'input', fields: {
                AND: {type: '[' + nm + ']'},
                OR: {type: '[' + nm + ']'}
              }
            };
            target.typeDefs[nm] = o;
            for (const k of Object.keys(src[filterField])) {
              const flt = src[filterField][k];
              for (const op of flt.op) {
                o.fields[k + (op !== 'eq' ? '_' + op : '')] = {
                  type: ['btw', 'nbtw', 'in', 'nin'].includes(op) ?
                      '[' + flt.type + ']' : flt.type
                };
              }
            }
          }

          if (src.sort) {
            delete dst.sort;
            // Create new enum type
            const nm = '_' + typ.name + '_' + n + '_sort';
            const o = target.typeDefs[nm] = {kind: 'enum', values: {}};
            dst.args = dst.args || {};
            dst.args.sort = {type: '[' + nm + ']'};
            for (const k of src.sort) {
              const m = String(k).match(/^(\+|-|\+-|-\+)?([\w$]+)$/);
              /* istanbul ignore next */
              if (!m)
                throw new SchemaError('"%s" does not match required format for "sort" property', k);
              if (!m[1] || m[1].includes('+'))
                o.values[m[2]] = {value: '+' + m[2]};
              if (m[1] && m[1].includes('-'))
                o.values[m[2] + '_dsc'] = {value: '-' + m[2]};
            }
          }

          if (src.limit != null) {
            delete dst.limit;
            dst.args = dst.args || {};
            dst.args.limit = {type: 'Int'};
            if (typeof src.limit === 'number')
              dst.args.limit.defaultValue = src.limit;
          }

          if (src.offset != null) {
            delete dst.offset;
            dst.args = dst.args || {};
            dst.args.offset = {type: 'Int'};
            if (typeof src.offset === 'number')
              dst.args.offset.defaultValue = src.offset;
          }

          if (dst.resolve && options.format !== EXPORT_GSB)
            dst.resolve = mergeResolvers(dst.resolve);

        } else delete dst.resolve;
      }
    };

    const exportInputType = () => {
      const o = getExportTarget();
      const copyFrom = (src) => {
        if (src.description)
          o.description = src.description;
        if (src.fields) {
          o.fields = o.fields || {};
          Object.assign(o.fields, src.fields);
        }
      };
      if (typ.extends)
        extendType((src) => copyFrom(src));
      copyFrom(typ.toJSON());
      return o;
    };

    const extendType = (fn) => {
      if (!typ.extends)
        return;
      const arr = makeArray(typ.extends);
      for (const k of arr) {
        const src = target.typeDefs[k];
        if (!src)
          throw new SchemaError('Type "%s" not found', k);
        if (src.kind !== typ.kind)
          throw new SchemaError('Can\'t extend %s type (%s) from %s type (%s)',
              typ.kind, typ.name, src.kind, src.name);
        fn(src);
      }
    };

    const mergeResolvers = (resolvers) => {
      /* istanbul ignore next */
      if (!resolvers)
        return;

      return function(parent, args, context, info) {
        return new Promise(((resolve, reject) => {
          const fns = Array.isArray(resolvers) ? resolvers.slice() : [resolvers];
          if (options.resolve)
            fns.unshift(options.resolve);
          let response;
          waterfall.every(fns, (next, fn, idx, rslt) => {
            if (rslt !== undefined)
              response = rslt;
            if (typeof fn === 'string') {
              const s = fn;
              fn = rootSchema.getCall(s, true);
              if (!fn)
                throw new ErrorEx('The call "%s" doesn\'t exists in schema', s);
            }
            info.response = response;
            const o = fn(parent, args, context, info);
            if (promisify.isPromise(o))
              return o;
            else {
              if (o !== undefined)
                response = o;
              next();
            }
          }, (err, v) => {
            if (err)
              return reject(err);
            resolve(v ? v : response);
          });
        }));
      };
    };

    switch (typ.kind) {
      case 'scalar': {
        exportScalarType();
        break;
      }
      case 'enum': {
        exportEnumType();
        break;
      }
      case 'interface': {
        exportInterfaceType();
        break;
      }
      case 'object': {
        exportObjectType();
        break;
      }
      case 'input': {
        exportInputType();
        break;
      }
    }

  }

  // ****** Export links for GSB format ******
  if (options.format === EXPORT_GSB) {
    for (const s of Object.keys(schema.links)) {
      const sch = schema.links[s];
      if (sch.location || sch.namespace) {
        target.links = target.links || [];
        target.links.push(sch.location || 'ns:' + sch.namespace);
      }
    }
  }

  // ****** Export types ******
  for (let phase = 0; phase <= 1; phase++) {
    for (const baseType of BASE_TYPES) {
      schema.iterateSchemas((sch) => {
        const typeNames = Object.keys(sch.types);
        if (!typeNames.length)
          return;
        for (const n of typeNames) {
          const t = sch.types[n];
          if (t.kind !== baseType ||
              (!phase && t.extension) || (phase && !t.extension))
            continue;
          if (t.kind !== baseType ||
              (!phase && t.extension) || (phase && !t.extension))
            continue;

          if (!exportedItems.has(t) && !t.extension &&
              target.typeDefs && target.typeDefs[n] &&
              !(n === 'Query' || n === 'Mutation'))
            throw new SchemaError('Type "%s" already defined.', n);

          const ext = t.extends ?
              (Array.isArray(t.extends) ? t.extends : [t.extends]) : null;
          if (ext) {
            for (const x of ext) {
              if (!target.typeDefs[x]) {
                const tt = rootSchema.getType(x, true, true);
                if (tt)
                  exportType(tt);
              }
            }
          }

          if (options.format === EXPORT_GSB) {
            target.typeDefs = target.typeDefs || {};
            target.typeDefs[n] = t.toJSON();
          } else
            exportType(t);
        }
      }, true);
    }
  }

  // ****** Export calls for GSB format ******
  if (options.format === EXPORT_GSB) {
    const callNames = Object.keys(schema.calls);
    if (callNames.length) {
      for (const n of callNames) {
        target.calls = target.calls || {};
        target.calls[n] = schema.calls[n];
      }
    }
  }

  // ***************

  if (options.format !== EXPORT_GSB && target.typeDefs) {
    if (options.format === EXPORT_GQL_PURE)
      target.resolvers = {};
    for (const n of Object.keys(target.typeDefs)) {
      const t = target.typeDefs[n];
      switch (t.kind) {

        case 'scalar': {
          if (t.parseValue) {
            const fn = mergeCalls(t.parseValue);
            if (options.format === EXPORT_GQL_PURE) {
              target.resolvers[n] = {};
              target.resolvers[n].parseValue = fn;
              delete t.parseValue;
            } else t.parseValue = fn;
          }
          if (t.parseLiteral) {
            const fn = mergeCalls(t.parseLiteral);
            if (options.format === EXPORT_GQL_PURE) {
              /* istanbul ignore next */
              target.resolvers[n] = target.resolvers[n] || {};
              target.resolvers[n].parseLiteral = fn;
              delete t.parseLiteral;
            } else
              t.parseLiteral = fn;
          }
          if (t.serialize) {
            const fn = mergeCalls(t.serialize);
            if (options.format === EXPORT_GQL_PURE) {
              /* istanbul ignore next */
              target.resolvers[n] = target.resolvers[n] || {};
              target.resolvers[n].serialize = fn;
              delete t.serialize;
            } else
              t.serialize = fn;
          }
          break;
        }

        case 'interface': {
          if (t.resolveType) {
            const fn = mergeCalls(t.resolveType);
            if (options.format === EXPORT_GQL_PURE) {
              target.resolvers[n] = {
                __resolveType: fn
              };
              delete t.resolveType;
            } else t.resolveType = fn;
          }
          break;
        }

        case 'object': {
          if (t.isTypeOf) {
            const fn = mergeCalls(t.isTypeOf);
            if (options.format === EXPORT_GQL_PURE) {
              target.resolvers[n] = {
                __isTypeOf: fn
              };
              delete t.isTypeOf;
            } else t.isTypeOf = fn;
          }
          /* istanbul ignore else */
          if (t.fields) {
            for (const nn of Object.keys(t.fields)) {
              const f = t.fields[nn];
              if (options.format === EXPORT_GQL_PURE && f.resolve) {
                target.resolvers[n] = target.resolvers[n] || {};
                target.resolvers[n][nn] = f.resolve;
                delete f.resolve;
              }
            }
          }
          break;
        }
      }
    }
  }

  return target;
}

module.exports = {
  exportSchema,
  EXPORT_GSB,
  EXPORT_GQL,
  EXPORT_GQL_PURE
};
