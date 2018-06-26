/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../lib/index');

describe('ObjectType', function() {

  const schema = new Schema();

  it('should check name argument', function() {
    try {
      schema.addObjectType('', {});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should check config argument', function() {
    try {
      schema.addObjectType('object1');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
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
          orderBy: ['id', '+name', '-+age', '-birth_date']
        }
      }
    });

    let v = schema.getType('object1');
    assert.equal(v.kind, 'object');
    assert.equal(v.description, 'object1 desc');
    assert.equal(v.fields.size, 3);
    assert.equal(v.fields.get('a').type, 'Int');
    assert.equal(v.fields.get('a').name, 'a');
    assert.equal(v.fields.get('b').type, 'String');
    assert.equal(v.fields.get('b').description, 'desc');
    assert.equal(v.fields.get('b').deprecationReason, 'dept');
    assert.equal(v.isTypeOf(), 'one');
    v = schema.getType('object10');
    assert.equal(v.extends, 'object1');
    v = schema.getType('object11');
    assert.deepEqual(v.extends, ['object1', 'object2']);
    v = schema.getType('object4');
    assert.equal(v.extension, true);
  });

  it('should not allow duplicates', function() {
    try {
      schema.addObjectType('object1', {fields: {a: 'Int'}});
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should validate field name', function() {
    try {
      schema.addObjectType('object3', {fields: {'1a': 'Int'}});
    } catch (e) {
      if (e.message.includes('Invalid'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.object1;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object1 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: '[Int!]'}
    });
    assert.equal(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.object10;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object10 desc');
    assert.deepEqual(o.fields, {
      a: {description: 'desc a', resolve: o.fields.a.resolve},
      b: {resolve: o.fields.b.resolve},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', resolve: o.fields.h.resolve}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.object11;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object11 desc');
    assert.equal(o.fields, undefined);
  });

  it('should export (EXPORT_GQL_SIMPLE) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.object10;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object10 desc');
    assert.deepEqual(o.interfaces, ['interface1']);
    assert.deepEqual(o.fields, {
      a: {type: 'Int', description: 'desc a', resolve: o.fields.a.resolve},
      b: {
        type: 'String', description: 'desc', deprecationReason: 'dept',
        resolve: o.fields.b.resolve
      },
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', resolve: o.fields.h.resolve}
    });
    assert.equal(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.object11;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object11 desc');
    assert.deepEqual(o.interfaces, ['interface1']);
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      c: {type: 'Float', args: {arg1: {type: 'Integer'}}},
      e: {type: '[Int!]'}
    });
    assert.equal(typeof o.isTypeOf, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE) - 3', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    let o = def.typeDefs.object21;
    assert.equal(o.kind, 'object');
    assert(o.fields.a.args);
    assert(o.fields.a.args.filter);
    assert.equal(o.fields.a.args.filter.type, '_object21_a_Filter');
    assert(o.fields.a.args.orderBy);
    assert.equal(o.fields.a.args.orderBy.type, '[_object21_a_OrderBy]');
    o = def.typeDefs._object21_a_Filter;
    assert(o);
    assert(o.fields.id_eq);
    assert.equal(o.fields.id_eq.type, 'int');
    assert.equal(o.fields.name_eq.type, 'string');
    assert.equal(o.fields.name_like.type, 'string');
    assert.equal(o.fields.age_eq.type, 'int');
    assert.equal(o.fields.age_gt.type, 'int');
    assert.equal(o.fields.age_lt.type, 'int');
    assert.equal(o.fields.birth_date_btw.type, '[Date]');
    o = def.typeDefs._object21_a_OrderBy;
    assert(o);
    assert.equal(o.values.id, '+id');
    assert.equal(o.values.id_dsc, undefined);
    assert.equal(o.values.name, '+name');
    assert.equal(o.values.name_dsc, undefined);
    assert.equal(o.values.age, '+age');
    assert.equal(o.values.age_dsc, '-age');
    assert.equal(o.values.birth_date, undefined);
    assert.equal(o.values.birth_date_dsc, '-birth_date');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_PURE});
    const o = def.typeDefs.object10;
    assert.equal(o.kind, 'object');
    assert.equal(o.description, 'object10 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int', description: 'desc a'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!'}
    });
    assert.equal(o.resolveType, undefined);
    assert.equal(typeof def.resolvers.object10, 'object');
    assert.equal(typeof def.resolvers.object10.__isTypeOf, 'function');
    assert.equal(typeof def.resolvers.object10.a, 'function');
    assert.equal(typeof def.resolvers.object10.b, 'function');
  });

  it('should extend from object type only', function() {
    schema.addEnumType('enum1', {values: {a: 1, b: 2}});
    schema.addObjectType('object20', {
      extends: 'enum1'
    });
    const v = schema.items.get('object20');
    try {
      let o = schema.export({format: 1});
    } catch (e) {
      schema._types.delete('object20');
      return;
    }
    assert(0, 'Failed');
  });

  it('should extend from existing types only', function() {
    schema.addObjectType('object20', {
      extends: 'enum_unknown'
    });
    const v = schema.items.get('object20');
    try {
      let o = schema.export({format: 1});
    } catch (e) {
      schema._types.delete('object20');
      return;
    }
    assert(0, 'Failed');
  });

  it('should check if field.resolve property is Function or String', function() {

    try {
      schema.addObjectType('object21', {
        fields: {
          a: {
            type: 'Int',
            resolve: 1
          }
        }
      });
    } catch (e) {
      try {
        schema.addObjectType('object21', {
          fields: {
            a: {
              type: 'Int',
              resolve: [1]
            }
          }
        });
      } catch (e) {
        return;
      }
    }
    assert(0, 'Failed');
  });

});