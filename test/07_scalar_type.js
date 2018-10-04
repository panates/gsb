/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../index');

describe('ScalarType', function() {

  const schema = new Schema();

  it('should check name argument', function() {
    try {
      schema.addScalarType('', {});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should check config argument', function() {
    try {
      schema.addScalarType('scalar1', 123);
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should create scalar type', function() {
    schema.addScalarType('scalar1', {
      description: 'scalar1 desc',
      serialize: () => {},
      parseLiteral: () => {},
      parseValue: () => {}
    });
    schema.addScalarType('scalar11');
    const scalar1 = schema.types.get('scalar1');
    assert(scalar1);
    assert.equal(scalar1.kind, 'scalar');
    assert.equal(scalar1.description, 'scalar1 desc');
    assert.equal(typeof scalar1.serialize, 'function');
    assert.equal(typeof scalar1.parseLiteral, 'function');
    assert.equal(typeof scalar1.parseValue, 'function');
  });

  it('should not allow duplicates', function() {
    try {
      schema.addScalarType('scalar1', {values: {a: 1}});
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should export (basic)', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.scalar1;
    assert.equal(o.kind, 'scalar');
    assert.equal(o.description, 'scalar1 desc');
    assert.equal(typeof o.parseLiteral, 'function');
    assert.equal(typeof o.parseValue, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    schema.addCall('scalar2.parseLiteral', () => true);
    schema.addCall('scalar2.parseValue', () => true);
    schema.addScalarType('scalar2', {
      parseLiteral: 'scalar2.parseLiteral',
      parseValue: 'scalar2.parseValue'
    });

    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.scalar2;
    assert.equal(typeof o.parseLiteral, 'function');
    assert.equal(typeof o.parseValue, 'function');
    assert.equal(o.serialize, undefined);
  });

});