/* eslint-disable */
const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('EnumType', function() {

  const schema = new SchemaBuilder();

  it('should validate type name', function() {
    try {
      schema.addEnumType('1enum', {});
    } catch (e) {
      if (e.message.includes('Invalid type name'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should check name argument', function() {
    try {
      schema.addEnumType('', {});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should check config argument', function() {
    try {
      schema.addEnumType('enum1');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should create enum type', function() {
    schema.addEnumType('enum1', {
      description: 'enum1 desc',
      values: {
        a: 1,
        b: {value: 2, description: 'desc', deprecationReason: 'dept'}
      }
    });
    schema.addEnumType('enum2', {});
    const enum1 = schema.getType('enum1');
    assert(enum1);
    assert.equal(enum1.kind, 'enum');
    assert.equal(enum1.toString(), '[object EnumType<enum1>]');
    assert.equal(enum1.description, 'enum1 desc');
    assert.equal(enum1.values.size, 2);
    assert.equal(enum1.values.get('a').value, 1);
    assert.equal(enum1.values.get('b').description, 'desc');
    assert.equal(enum1.values.get('b').deprecationReason, 'dept');
    assert(enum1.owner === schema);
    assert.equal(typeof enum1.toJSON(), 'object');
  });

  it('should extend from other enum', function() {
    schema.addEnumType('enum11', {
      extends: 'enum1',
      description: 'enum11 desc',
      values: {
        c: {value: 3, description: ''}
      }
    });
    const enum11 = schema.getType('enum11');
    assert(enum11);
    assert.equal(enum11.kind, 'enum');
    assert.equal(enum11.extends, 'enum1');
    assert.equal(enum11.values.size, 1);
    assert.equal(enum11.values.get('c').value, 3);
    assert.equal(enum11.values.get('c').name, 'c');
  });

  it('should not allow duplicates', function() {
    try {
      schema.addEnumType('enum1', {values: {a: 1}});
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should validate value name', function() {
    try {
      schema.addEnumType('enum3', {values: {'1a': 1}});
    } catch (e) {
      if (e.message.includes('Invalid'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should export', function() {
    const o = schema.export();
    assert.deepEqual(o.typeDefs.enum1, {
      description: 'enum1 desc',
      kind: 'enum',
      values: {
        a: {
          value: 1
        },
        b: {
          value: 2,
          deprecationReason: 'dept',
          description: 'desc'
        }
      }
    });
    assert.deepEqual(o.typeDefs.enum11, {
      description: 'enum11 desc',
      kind: 'enum',
      extends: 'enum1',
      values: {
        c: {
          value: 3
        }
      }
    });
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    const o = schema.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    assert.deepEqual(o.typeDefs.enum11, {
      description: 'enum11 desc',
      kind: 'enum',
      values: {
        a: {
          value: 1
        },
        b: {
          value: 2,
          deprecationReason: 'dept',
          description: 'desc'
        },
        c: {
          value: 3
        }
      }
    });
  });

});
