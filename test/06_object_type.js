/* eslint-disable */
const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('ObjectType', function() {

  const schema = new SchemaBuilder();

  it('should check name argument', function() {
    assert.throws(() => {
      schema.addObjectType('', {});
    }, /Invalid type name/);
  });

  it('should check config argument', function() {
    assert.throws(() => {
      schema.addObjectType('object1');
    }, /You must provide configuration object/);
  });

  it('should create object type', function() {

    schema.addInterfaceType('interface1', {
      fields: {
        a: 'Int'
      }
    });

    schema.addInterfaceType('interface2', {
      fields: {
        b: 'String'
      }
    });

    schema.addObjectType('object1', {
      description: 'object1 desc',
      interfaces: 'interface1',
      fields: {
        a: 'Int',
        b: {
          type: 'String',
          description: 'desc',
          deprecationReason: 'dept',
          resolve: null
        },
        e: '[Int!]'
      },
      isTypeOf: () => {return 'one';}
    });
    schema.addObjectType('object2', {
      description: 'object2 desc',
      fields: {
        c: {type: 'Float', args: {arg1: 'Integer'}}
      },
      isTypeOf: () => {return 'two';}
    });
    schema.addObjectType('object4', {
      extension: true,
      fields: {
        h: 'Float'
      }
    });
    schema.addObjectType('object10', {
      description: 'object10 desc',
      extends: 'object1',
      fields: {
        a: {description: 'desc a', resolve: () => true},
        b: {resolve: 'resolve1'},
        f: '[Int]!',
        h: {
          type: 'String',
          list: true, nonNull: true, nonNullItems: true,
          deprecationReason: '', resolve: [() => true]
        }
      }
    });
    schema.addObjectType('object11', {
      description: 'object11 desc',
      extends: ['object1', 'object2']
    });
    schema.addCall('resolve1', () => 1);
    schema.addObjectType('object21', {
      fields: {
        a: {
          type: 'String',
          filter: {
            'id': 'int',
            'name': {type: 'string', op: ['eq', 'like']},
            'age': {type: 'int', op: ['eq', 'gt', 'lt']},
            'birth_date': {type: 'Date', op: ['btw']}
          },
          sort: ['id', '+name', '-+age', '-birth_date'],
          limit: 100,
          offset: true
        }
      }
    });

    let v = schema.getType('object1');
    assert.strictEqual(v.kind, 'object');
    assert.strictEqual(v.description, 'object1 desc');
    assert.strictEqual(v.fields.size, 3);
    assert.strictEqual(v.fields.get('a').type, 'Int');
    assert.strictEqual(v.fields.get('a').name, 'a');
    assert.strictEqual(v.fields.get('b').type, 'String');
    assert.strictEqual(v.fields.get('b').description, 'desc');
    assert.strictEqual(v.fields.get('b').deprecationReason, 'dept');
    assert.strictEqual(v.isTypeOf(), 'one');
    v = schema.getType('object10');
    assert.strictEqual(v.extends, 'object1');
    v = schema.getType('object11');
    assert.deepStrictEqual(v.extends, ['object1', 'object2']);
    v = schema.getType('object4');
    assert.strictEqual(v.extension, true);
  });

  it('should not allow duplicates', function() {
    assert.throws(() => {
      schema.addObjectType('object1', {fields: {a: 'Int'}});
    }, /already exists/);
  });

  it('should validate field name', function() {
    assert.throws(() => {
      schema.addObjectType('object3', {fields: {'1a': 'Int'}});
    }, /Invalid field name/);
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.object1;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object1 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: '[Int!]'}
    });
    assert.strictEqual(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.object10;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object10 desc');
    assert.deepStrictEqual(o.fields, {
      a: {description: 'desc a', resolve: o.fields.a.resolve},
      b: {resolve: o.fields.b.resolve},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', resolve: o.fields.h.resolve}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.object11;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object11 desc');
    assert.strictEqual(o.fields, undefined);
  });

  it('should export (EXPORT_GQL) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL});
    const o = def.typeDefs.object10;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object10 desc');
    assert.deepStrictEqual(o.interfaces, ['interface1']);
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int', description: 'desc a', resolve: o.fields.a.resolve},
      b: {
        type: 'String', description: 'desc', deprecationReason: 'dept',
        resolve: o.fields.b.resolve
      },
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', resolve: o.fields.h.resolve}
    });
    assert.strictEqual(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GQL) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL});
    const o = def.typeDefs.object11;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object11 desc');
    assert.deepStrictEqual(o.interfaces, ['interface1']);
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      c: {type: 'Float', args: {arg1: {type: 'Integer'}}},
      e: {type: '[Int!]'}
    });
    assert.strictEqual(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GQL) - 3', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL});
    let o = def.typeDefs.object21;
    assert.strictEqual(o.kind, 'object');
    assert(o.fields.a.args);
    assert(o.fields.a.args.filter);
    assert.strictEqual(o.fields.a.args.filter.type, '_object21_a_Filter');
    assert(o.fields.a.args.sort);
    assert.strictEqual(o.fields.a.args.sort.type, '[_object21_a_sort]');
    assert.strictEqual(o.fields.a.args.limit.type, 'Int');
    assert.strictEqual(o.fields.a.args.limit.defaultValue, 100);
    assert.strictEqual(o.fields.a.args.offset.type, 'Int');
    o = def.typeDefs._object21_a_Filter;
    assert(o);
    assert(o.fields.id);
    assert.strictEqual(o.fields.id.type, 'int');
    assert.strictEqual(o.fields.name.type, 'string');
    assert.strictEqual(o.fields.name_like.type, 'string');
    assert.strictEqual(o.fields.age.type, 'int');
    assert.strictEqual(o.fields.age_gt.type, 'int');
    assert.strictEqual(o.fields.age_lt.type, 'int');
    assert.strictEqual(o.fields.birth_date_btw.type, '[Date]');
    o = def.typeDefs._object21_a_sort;
    assert(o);
    assert.strictEqual(o.values.id.value, '+id');
    assert.strictEqual(o.values.id_dsc, undefined);
    assert.strictEqual(o.values.name.value, '+name');
    assert.strictEqual(o.values.name_dsc, undefined);
    assert.strictEqual(o.values.age.value, '+age');
    assert.strictEqual(o.values.age_dsc.value, '-age');
    assert.strictEqual(o.values.birth_date, undefined);
    assert.strictEqual(o.values.birth_date_dsc.value, '-birth_date');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_PURE});
    const o = def.typeDefs.object10;
    assert.strictEqual(o.kind, 'object');
    assert.strictEqual(o.description, 'object10 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int', description: 'desc a'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!'}
    });
    assert.strictEqual(o.resolveType, undefined);
    assert.strictEqual(typeof def.resolvers.object10, 'object');
    assert.strictEqual(typeof def.resolvers.object10.__isTypeOf, 'function');
    assert.strictEqual(typeof def.resolvers.object10.a, 'function');
    assert.strictEqual(typeof def.resolvers.object10.b, 'function');
  });

  it('should extend from object type only', function() {
    schema.addEnumType('enum1', {values: {a: 1, b: 2}});
    schema.addObjectType('object20', {
      extends: 'enum1'
    });
    assert(schema.types['object20']);
    assert.throws(() => {
      schema.export({format: 1});
    }, /Can't extend object type/);
    delete schema._types['object20'];
  });

  it('should extend from existing types only', function() {
    schema.addObjectType('object20', {
      extends: 'enum_unknown'
    });
    assert(schema.types['object20']);
    assert.throws(() => {
      schema.export({format: 1});
    }, /not found/);
    delete schema._types['object20'];
  });

  it('should check if field.resolve property is Function or String', function() {
    assert.throws(() => {
      schema.addObjectType('object25', {
        fields: {
          a: {
            type: 'Int',
            resolve: 1
          }
        }
      });
    }, /You must provide/);

    assert.throws(() => {
      schema.addObjectType('object25', {
        fields: {
          a: {
            type: 'Int',
            resolve: [1]
          }
        }
      });
    }, /You must provide /);
  });

});
