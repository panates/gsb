/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {SchemaError} = require('./errors');
const {parseTypeString} = require('./helpers');
const {EXPORT_GQL_SIMPLE} = require('./exporter');

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

function buildGraphQLSchema(schema, options) {
  options = options || {};
  options.format = EXPORT_GQL_SIMPLE;
  const def = schema.export(options);
  const types = {};

  const getType = (typeName) => {
    const k = parseTypeString(typeName);
    let typ;
    switch (k.type) {
      case 'String':
        typ = GraphQLString;
        break;
      case 'Int':
        typ = GraphQLInt;
        break;
      case 'Boolean':
        typ = GraphQLBoolean;
        break;
      case 'Float':
        typ = GraphQLFloat;
        break;
      case 'ID':
        typ = GraphQLID;
        break;
      default:
        typ = types[k.type];
    }
    if (!typ)
      throw new SchemaError('Unknown type "%s"', k.type);

    /* type */
    if (k.list) {
      if (k.nonNullItems)
        typ = new GraphQLNonNull(typ);
      typ = new GraphQLList(typ);
    }
    if (k.nonNull)
      typ = new GraphQLNonNull(typ);
    return typ;
  };

  const createGraphQLObjectType = (name, t) => {
    /* istanbul ignore next */
    if (!t.fields)
      return;
    return new GraphQLObjectType({
      name,
      description: t.description,
      fields: () => createObjectFields(name, t.fields),
      interfaces: () => {
        if (!t.interfaces)
          return;
        const result = [];
        for (const intf of t.interfaces) {
          result.push(getType(intf));
        }
        return result;
      },
      isTypeOf: t.isTypeOf
    });
  };

  const createGraphQLInterfaceType = (name, t) => {
    /* istanbul ignore next */
    if (!t.fields)
      return;
    return new GraphQLInterfaceType({
      name,
      description: t.description,
      fields: () => createObjectFields(name, t.fields),
      resolveType: t.resolveType
    });
  };

  const createGraphQLInputObjectType = (name, t) => {
    /* istanbul ignore next */
    if (!t.fields)
      return;
    return new GraphQLInputObjectType({
      name,
      description: t.description,
      fields: () => createInputObjectFields(name, t.fields)
    });
  };

  const createObjectFields = (objName, fields) => {
    const result = {};
    for (const name of Object.keys(fields)) {
      const f = fields[name];
      if (!f.type)
        throw new SchemaError('Field "%s" of "%s" is not properly defined. You must provide "type" property.',
            name, objName);
      const typ = getType(f.type);
      /* args */
      const args = {};
      if (f.args) {
        for (const m of Object.keys(f.args)) {
          const arg = f.args[m];
          const k = getType(arg.type);
          args[m] = {
            type: k,
            defaultValue: arg.defaultValue,
            description: arg.description
          };
        }
      }

      result[name] = {
        type: typ,
        description: f.description,
        deprecationReason: f.deprecationReason,
        args,
        resolve: f.resolve
      };
    }
    return result;
  };

  const createInputObjectFields = (objName, fields) => {
    const result = {};
    for (const name of Object.keys(fields)) {
      const f = fields[name];
      if (!f.type)
        throw new SchemaError('Field "%s" of "%s" is not properly defined. You must provide "type" property.',
            name, objName);
      const typ = getType(f.type);
      result[name] = {
        type: typ,
        description: f.description,
        deprecationReason: f.deprecationReason,
        defaultValue: f.defaultValue
      };
    }
    return result;
  };

  for (const name of Object.keys(def.typeDefs)) {
    const o = def.typeDefs[name];
    let inst;
    switch (o.kind) {
      case 'scalar': {
        o.name = name;
        inst = new GraphQLScalarType(o);
        break;
      }
      case 'enum': {
        o.name = name;
        inst = new GraphQLEnumType(o);
        break;
      }
      case 'interface': {
        inst = createGraphQLInterfaceType(name, o);
        break;
      }
      case 'object': {
        inst = createGraphQLObjectType(name, o);
        break;
      }
      case 'input': {
        inst = createGraphQLInputObjectType(name, o);
        break;
      }
    }
    /* istanbul ignore else */
    if (inst)
      types[name] = inst;
  }
  return new GraphQLSchema({
    query: types.Query,
    mutation: types.Mutation
  });
}

module.exports = buildGraphQLSchema;
