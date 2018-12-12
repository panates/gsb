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
const EXPORT_GSB = 0;
/** @const {Integer} */
const EXPORT_GQL_SIMPLE = 1;
/** @const {Integer} */
const EXPORT_GQL_PURE = 2;

function exportSchema(schema, options) {

  const out = {};
  options = options || {};
  options.format = options.format || EXPORT_GSB;
  const gqlFormat = options.format > EXPORT_GSB;

  const exportType = (name, typ) => {
    const o = out.typeDefs[name] || {kind: typ.kind};
    out.typeDefs[name] = o;
    return o;
  };

  const exportEnumType = (name, typ) => {
    const o = exportType(name, typ);
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
    extendType(typ, (src) => copyFrom(src));
    copyFrom(typ.toJSON());
    return o;
  };

  const exportScalarType = (name, typ) => {
    const o = exportType(name, typ);
    Object.assign(o, typ.toJSON());
    return o;
  };

  const exportInterfaceType = (name, typ, sch) => {
    const o = exportType(name, typ);
    const copyFrom = (src) => {
      if (src.description)
        o.description = src.description;
      if (src.resolveType)
        o.resolveType = src.resolveType;
      if (src.fields) {
        o.fields = o.fields || {};
        exportObjectFields(src.fields, o.fields, sch, typ.kind);
      }
    };
    if (typ.extends)
      extendType(typ, (src) => copyFrom(src));
    copyFrom(typ.toJSON());
    return o;
  };

  const exportObjectType = (name, typ, sch) => {
    const o = exportType(name, typ);
    const copyFrom = (src) => {
      if (src.description)
        o.description = src.description;
      if (src.interfaces) {
        o.interfaces = makeArray(o.interfaces, src.interfaces);
        for (const i of o.interfaces) {
          const intf = out.typeDefs[i];
          // Define interface fields to object
          /* istanbul ignore else */
          if (intf) {
            o.fields = o.fields || {};
            merge.deep.defaults(o.fields, intf.fields);
          }
        }
      }
      if (src.isTypeOf)
        o.isTypeOf = makeArray(src.isTypeOf);
      if (src.fields) {
        o.fields = o.fields || {};
        exportObjectFields(src.fields, o.fields, sch, typ.kind, name);
      }
    };
    if (typ.extends)
      extendType(typ, (src) => copyFrom(src));
    copyFrom(typ.toJSON());
    return o;
  };

  const exportObjectFields = (srcFields, dstFields, sch, kind, typName) => {
    for (const n of Object.keys(srcFields)) {
      const src = srcFields[n];
      const dst = dstFields[n] = dstFields[n] || {};
      Object.assign(dst, src);
      if (kind && kind === 'object') {

        if (src.filter) {
          delete dst.filter;
          // Create new input type for filter
          const nm = '_' + typName + '_' + n + '_Filter';
          dst.args = dst.args || {};
          dst.args.filter = {type: nm};
          const o = {
            kind: 'input', fields: {
              AND: {type: '[' + nm + ']'},
              OR: {type: '[' + nm + ']'}
            }
          };
          out.typeDefs[nm] = o;
          for (const k of Object.keys(src.filter)) {
            const flt = src.filter[k];
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
          const nm = '_' + typName + '_' + n + '_sort';
          const o = out.typeDefs[nm] = {kind: 'enum', values: {}};
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
          if (src.limit >= 0)
            dst.args.limit.defaultValue = src.limit;
        }

        if (src.offset != null) {
          delete dst.offset;
          dst.args = dst.args || {};
          dst.args.offset = {type: 'Int'};
          if (src.limit >= 0)
            dst.args.offset.defaultValue = src.offset;
        }

        if (dst.resolve && options.format > EXPORT_GSB)
          dst.resolve = mergeResolvers(dst.resolve);

      } else delete dst.resolve;
    }
  };

  const exportInputType = (name, typ) => {
    const o = exportType(name, typ);
    const copyFrom = (src) => {
      if (src.description)
        o.description = src.description;
      if (src.fields) {
        o.fields = o.fields || {};
        Object.assign(o.fields, src.fields);
      }
    };
    if (typ.extends)
      extendType(typ, (src) => copyFrom(src));
    copyFrom(typ.toJSON());
    return o;
  };

  const extendType = (typ, fn) => {
    if (!typ.extends)
      return;
    const arr = makeArray(typ.extends);
    for (const k of arr) {
      const src = out.typeDefs[k];
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
            fn = schema.getCall(s, true);
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

  const processed = {};
  const processSchema = (sch) => {

    if (sch.links.size) {
      if (gqlFormat) {
        for (const [namespace, sch1] of sch.links.entries()) {
          if (!processed[namespace]) {
            processed[namespace] = sch1;
            processSchema(sch1);
          }
        }
      } else {
        out.links = [];
        for (const sch1 of sch._links) {
          out.links.push(sch1.location ? sch1.location :
              (sch1.namespace ? 'ns:' + sch1.namespace : '[Schema]'));
        }
      }
    }

    if (sch._types.size) {
      out.typeDefs = out.typeDefs || {};

      if (gqlFormat) {
        const TYPES = ['scalar', 'enum', 'interface', 'input', 'object'];
        /* Convert type objects to json objects */
        for (let phase = 0; phase <= 1; phase++) {
          for (const r of TYPES) {
            for (const [n, t] of sch._types.entries()) {
              if (t.kind !== r || (!phase && t.extension) ||
                  (phase && !t.extension))
                continue;
              if (!t.extension && out.typeDefs[n] &&
                  !(n === 'Query' || n === 'Mutation'))
                throw new SchemaError('Type "%s" already defined.', n);
              switch (t.kind) {
                case 'scalar': {
                  exportScalarType(n, t, sch);
                  break;
                }
                case 'enum': {
                  exportEnumType(n, t, sch);
                  break;
                }
                case 'interface': {
                  exportInterfaceType(n, t, sch);
                  break;
                }
                case 'object': {
                  exportObjectType(n, t, sch);
                  break;
                }
                case 'input': {
                  exportInputType(n, t, sch);
                  break;
                }
              }
            }
          }

        }
      } else {
        for (const [n, t] of sch._types.entries()) {
          out.typeDefs[n] = t.toJSON();
        }
      }
    }

    if (!gqlFormat && sch._calls.size) {
      out.calls = out.calls || {};
      for (const [n, fn] of sch._calls.entries()) {
        out.calls[n] = fn;
      }
    }

  };

  processSchema(schema);

  // ***************

  if (gqlFormat && out.typeDefs) {
    if (options.format === EXPORT_GQL_PURE)
      out.resolvers = {};
    for (const n of Object.keys(out.typeDefs)) {
      const t = out.typeDefs[n];
      switch (t.kind) {

        case 'scalar': {
          if (t.parseValue) {
            const fn = mergeCalls(t.parseValue);
            if (options.format === EXPORT_GQL_PURE) {
              out.resolvers[n] = {};
              out.resolvers[n].parseValue = fn;
              delete t.parseValue;
            } else t.parseValue = fn;
          }
          if (t.parseLiteral) {
            const fn = mergeCalls(t.parseLiteral);
            if (options.format === EXPORT_GQL_PURE) {
              /* istanbul ignore next */
              out.resolvers[n] = out.resolvers[n] || {};
              out.resolvers[n].parseLiteral = fn;
              delete t.parseLiteral;
            } else
              t.parseLiteral = fn;
          }
          if (t.serialize) {
            const fn = mergeCalls(t.serialize);
            if (options.format === EXPORT_GQL_PURE) {
              /* istanbul ignore next */
              out.resolvers[n] = out.resolvers[n] || {};
              out.resolvers[n].serialize = fn;
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
              out.resolvers[n] = {
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
              out.resolvers[n] = {
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
                out.resolvers[n] = out.resolvers[n] || {};
                out.resolvers[n][nn] = f.resolve;
                delete f.resolve;
              }
            }
          }
          break;
        }
      }
    }
  }

  return out;
}

module.exports = {
  exportSchema,
  EXPORT_GSB,
  EXPORT_GQL_SIMPLE,
  EXPORT_GQL_PURE
};
