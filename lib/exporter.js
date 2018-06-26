/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {SchemaError} = require('./errors');
const {makeArray, mergeCalls} = require('./helpers');

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
      if (src.interfaces)
        o.interfaces = makeArray(o.interfaces, src.interfaces);
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
    Object.getOwnPropertyNames(srcFields).forEach(n => {
      const src = srcFields[n];
      const dst = dstFields[n] = dstFields[n] || {};
      Object.assign(dst, src);
      if (kind === 'object') {

        if (src.filter) {
          delete dst.filter;
          // Create new input type for filter
          const nm = '_' + typName + '_' + n + '_Filter';
          const o = {kind: 'input', fields: {}};
          out.typeDefs[nm] = o;
          dst.args = dst.args || {};
          dst.args.filter = {type: nm};
          Object.getOwnPropertyNames(src.filter).forEach(n => {
            const flt = src.filter[n];
            flt.op.forEach(op => {
              o.fields[n + '_' + op] = {
                type: ['btw', 'nbtw', 'in', 'nin'].indexOf(op) >= 0 ?
                    '[' + flt.type + ']' : flt.type
              };
            });
          });
        }

        if (src.orderBy) {
          delete dst.orderBy;
          // Create new enum type
          const nm = '_' + typName + '_' + n + '_OrderBy';
          const o = out.typeDefs[nm] = {kind: 'enum', values: {}};
          dst.args = dst.args || {};
          dst.args.orderBy = {type: '[' + nm + ']'};
          src.orderBy.forEach(n => {
            const m = String(n).match(/^(\+|-|\+-|-\+)?([\w$]+)$/);
            if (!m)
              throw new SchemaError('"%s" does not match required format for orderBy property', n);
            if (!m[1] || m[1].indexOf('+') >= 0)
              o.values[m[2]] = '+' + m[2];
            if (m[1] && m[1].indexOf('-') >= 0)
              o.values[m[2] + '_dsc'] = '-' + m[2];
          });
        }

        // Combine resolvers into single resolver
        const resolve = makeArray(dst.resolve);
        if (resolve.length) {
          resolve.forEach((v, i) => {
            if (typeof v !== 'function')
              resolve[i] = sch.getCall(v);
          });
          dst.resolve = resolve;
        }

      } else delete dst.resolve;
    });
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
    arr.forEach(i => {
      const src = out.typeDefs[i];
      if (!src)
        throw new SchemaError('Type "%s" not found', i);
      if (src.kind !== typ.kind)
        throw new SchemaError('Can\'t extend %s type (%s) from %s type (%s)',
            typ.kind, typ.name, src.kind, src.name);
      fn(src);
    });
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
        out.link = [];
        sch._links.forEach(sch1 => {
          out.link.push(sch1.namespace);
        });
      }
    }

    if (sch._types.size) {
      out.typeDefs = out.typeDefs || {};

      if (gqlFormat) {
        /* Convert type objects to json objects */
        for (let phase = 0; phase <= 1; phase++) {
          for (const [n, t] of sch._types.entries()) {
            if ((!phase && t.extension) || (phase && !t.extension))
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
    Object.getOwnPropertyNames(out.typeDefs).forEach(n => {
      const t = out.typeDefs[n];
      switch (t.kind) {
        case 'scalar': {
          let fn = mergeCalls(t.parseValue);
          if (fn) {
            if (options.format === EXPORT_GQL_PURE) {
              out.resolvers[n] = {};
              out.resolvers[n].parseValue = fn;
              delete t.parseValue;
            } else t.parseValue = fn;
          }
          fn = mergeCalls(t.parseLiteral);
          if (fn) {
            if (options.format === EXPORT_GQL_PURE) {
              /* istanbul ignore next */
              out.resolvers[n] = out.resolvers[n] || {};
              out.resolvers[n].parseLiteral = fn;
              delete t.parseLiteral;
            } else
              t.parseLiteral = fn;
          }
          fn = mergeCalls(t.serialize);
          if (fn) {
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
          const fn = mergeCalls(t.resolveType);
          if (fn) {
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
          let fn = mergeCalls(t.isTypeOf);
          if (fn) {
            if (options.format === EXPORT_GQL_PURE) {
              out.resolvers[n] = {
                __isTypeOf: fn
              };
              delete t.isTypeOf;
            } else t.isTypeOf = fn;
          }
          /* istanbul ignore else */
          if (t.fields) {
            Object.getOwnPropertyNames(t.fields).forEach(nn => {
              const f = t.fields[nn];
              fn = mergeCalls(f.resolve);
              if (fn) {
                if (options.format === EXPORT_GQL_PURE) {
                  out.resolvers[n] = out.resolvers[n] || {};
                  out.resolvers[n][nn] = fn;
                  delete f.resolve;
                } else
                  f.resolve = fn;
              }
            });
          }
          break;
        }
      }
    });
  }

  return out;

}

module.exports = {
  exportSchema,
  EXPORT_GSB,
  EXPORT_GQL_SIMPLE,
  EXPORT_GQL_PURE
};
