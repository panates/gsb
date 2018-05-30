/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const {SchemaError} = require('./errors');
const {parseTypeString, parseInputTypeString} = require('./helpers');
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

function generateGraphQLSchema(schema) {
  const def = schema.export({format: EXPORT_GQL_SIMPLE});
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
        t.interfaces.forEach(i => result.push(getType(i)));
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
    const keys = Object.getOwnPropertyNames(fields);
    const result = {};
    keys.forEach(n => {
      const f = fields[n];
      const typ = getType(f.type);
      /* args */
      const args = {};
      if (f.args) {
        Object.getOwnPropertyNames(f.args).forEach(m => {
          const a = f.args[m];
          const k = getType(a.type);
          args[m] = {
            type: k,
            defaultValue: a.defaultValue,
            description: a.description
          };
        });
      }

      result[n] = {
        type: typ,
        description: f.description,
        deprecationReason: f.deprecationReason,
        args,
        resolve: f.resolve
      };
    });
    return result;
  };

  const createInputObjectFields = (objName, fields) => {
    const keys = Object.getOwnPropertyNames(fields);
    const result = {};
    keys.forEach(n => {
      const f = fields[n];
      const k = parseInputTypeString(f.type);
      const typ = getType(k.type);
      result[n] = {
        type: typ,
        description: f.description,
        deprecationReason: f.deprecationReason
      };
    });
    return result;
  };

  Object.getOwnPropertyNames(def.typeDefs).forEach(n => {
    const o = def.typeDefs[n];
    let inst;
    switch (o.kind) {
      case 'scalar': {
        o.name = n;
        inst = new GraphQLScalarType(o);
        break;
      }
      case 'enum': {
        o.name = n;
        inst = new GraphQLEnumType(o);
        break;
      }
      case 'interface': {
        inst = createGraphQLInterfaceType(n, o);
        break;
      }
      case 'object': {
        inst = createGraphQLObjectType(n, o);
        break;
      }
      case 'input': {
        inst = createGraphQLInputObjectType(n, o);
        break;
      }
    }
    /* istanbul ignore else */
    if (inst)
      types[n] = inst;
  });
  return new GraphQLSchema({
    query: types.Query,
    mutation: types.Mutation
  });
}

module.exports = generateGraphQLSchema;
