/* eslint-disable */
const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('InputObject', function() {

  const schema = new SchemaBuilder();

  it('should check name argument', function() {
    assert.throws(() => {
      schema.addInputType('', {});
    }, /Invalid type name/);
  });

  it('should check config argument', function() {
    assert.throws(() => {
      schema.addInputType('input1');
    }, /You must provide configuration object/);
  });

  it('should create input type', function() {

    schema.addInputType('input1', {
      description: 'input1 desc',
      fields: {
        a: 'Int=0',
        b: {type: 'String', description: 'desc', defaultValue: 'abc'},
        e: '[Int!]'
      }
    });
    schema.addInputType('input2', {
      description: 'input2 desc',
      fields: {
        c: 'Float'
      }
    });
    schema.addInputType('input10', {
      description: 'input10 desc',
      extends: 'input1',
      fields: {
        f: '[Int]!',
        h: {
          type: 'String',
          list: true, nonNull: true, nonNullItems: true,
          deprecationReason: 'h deprecated'
        }
      }
    });
    schema.addInputType('input11', {
      description: 'input11 desc',
      extends: ['input1', 'input2']
    });
    let v = schema.getType('input1');
    assert.strictEqual(v.kind, 'input');
    assert.strictEqual(v.description, 'input1 desc');
    assert.strictEqual(v.fields.size, 3);
    assert.strictEqual(v.fields.get('a').name, 'a');
    assert.strictEqual(v.fields.get('a').type, 'Int');
    assert.strictEqual(v.fields.get('b').type, 'String');
    assert.strictEqual(v.fields.get('b').description, 'desc');
    v = schema.getType('input10');
    assert.strictEqual(v.extends, 'input1');
    v = schema.getType('input11');
    assert.deepStrictEqual(v.extends, ['input1', 'input2']);
  });

  it('should not allow duplicates', function() {
    assert.throws(() => {
      schema.addInputType('input1', {fields: {a: 'Int'}});
    }, /already exists/);
  });

  it('should validate field name', function() {
    assert.throws(() => {
      schema.addInputType('input3', {fields: {'1a': 'Int'}});
    }, /Invalid/);
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.input1;
    assert.strictEqual(o.kind, 'input');
    assert.strictEqual(o.description, 'input1 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int', defaultValue: 0},
      b: {type: 'String', description: 'desc', defaultValue: 'abc'},
      e: {type: '[Int!]'}
    });
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.input10;
    assert.strictEqual(o.kind, 'input');
    assert.strictEqual(o.description, 'input10 desc');
    assert.strictEqual(o.extends, 'input1');
    assert.deepStrictEqual(o.fields, {
      f: {type: '[Int]!'},
      h: {type: '[String!]!', deprecationReason: 'h deprecated'}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.input11;
    assert.strictEqual(o.kind, 'input');
    assert.strictEqual(o.description, 'input11 desc');
    assert.deepStrictEqual(o.extends, ['input1', 'input2']);
    assert.deepStrictEqual(o.fields, undefined);
  });

  it('should export (EXPORT_GQL) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL});
    const o = def.typeDefs.input10;
    assert.strictEqual(o.kind, 'input');
    assert.strictEqual(o.description, 'input10 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int', defaultValue: 0},
      b: {type: 'String', description: 'desc', defaultValue: 'abc'},
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', deprecationReason: 'h deprecated'}
    });
  });

  it('should export (EXPORT_GQL) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL});
    const o = def.typeDefs.input11;
    assert.strictEqual(o.kind, 'input');
    assert.strictEqual(o.description, 'input11 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int', defaultValue: 0},
      b: {type: 'String', description: 'desc', defaultValue: 'abc'},
      c: {type: 'Float'},
      e: {type: '[Int!]'}
    });
  });

  it('should extend from input type only', function() {
    schema.addEnumType('enum1', {values: {a: 1, b: 2}});

    schema.addInputType('input20', {
      extends: 'enum1'
    });

    assert.throws(() => {
      const v = schema.types['input20'];
      v.export({format: 1});
    }, /export is not a function/);
  });

});
