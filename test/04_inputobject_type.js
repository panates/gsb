/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../index');

describe('InputObject', function() {

  const schema = new Schema();

  it('should check name argument', function() {
    try {
      schema.addInputType('', {});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should check config argument', function() {
    try {
      schema.addInputType('input1');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
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
    assert.equal(v.kind, 'input');
    assert.equal(v.description, 'input1 desc');
    assert.equal(v.fields.size, 3);
    assert.equal(v.fields.get('a').name, 'a');
    assert.equal(v.fields.get('a').type, 'Int');
    assert.equal(v.fields.get('b').type, 'String');
    assert.equal(v.fields.get('b').description, 'desc');
    v = schema.getType('input10');
    assert.equal(v.extends, 'input1');
    v = schema.getType('input11');
    assert.deepEqual(v.extends, ['input1', 'input2']);
  });

  it('should not allow duplicates', function() {
    try {
      schema.addInputType('input1', {fields: {a: 'Int'}});
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should validate field name', function() {
    try {
      schema.addInputType('input3', {fields: {'1a': 'Int'}});
    } catch (e) {
      if (e.message.includes('Invalid'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.input1;
    assert.equal(o.kind, 'input');
    assert.equal(o.description, 'input1 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int', defaultValue: 0},
      b: {type: 'String', description: 'desc', defaultValue: 'abc'},
      e: {type: '[Int!]'}
    });
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.input10;
    assert.equal(o.kind, 'input');
    assert.equal(o.description, 'input10 desc');
    assert.equal(o.extends, 'input1');
    assert.deepEqual(o.fields, {
      f: {type: '[Int]!'},
      h: {type: '[String!]!', deprecationReason: 'h deprecated'}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.input11;
    assert.equal(o.kind, 'input');
    assert.equal(o.description, 'input11 desc');
    assert.deepEqual(o.extends, ['input1', 'input2']);
    assert.deepEqual(o.fields, null);
  });

  it('should export (EXPORT_GQL_SIMPLE) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.input10;
    assert.equal(o.kind, 'input');
    assert.equal(o.description, 'input10 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int', defaultValue: 0},
      b: {type: 'String', description: 'desc', defaultValue: 'abc'},
      e: {type: '[Int!]'},
      f: {type: '[Int]!'},
      h: {type: '[String!]!', deprecationReason: 'h deprecated'}
    });
  });

  it('should export (EXPORT_GQL_SIMPLE) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.input11;
    assert.equal(o.kind, 'input');
    assert.equal(o.description, 'input11 desc');
    assert.deepEqual(o.fields, {
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

    try {
      const v = schema.types.get('input20');
      let o = v.export({format: 1});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

});