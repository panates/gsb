/* eslint-disable */
const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('ScalarType', function() {

  const schema = new SchemaBuilder();

  it('should check name argument', function() {
    assert.throws(() => {
      schema.addScalarType('', {});
    }, /Invalid type name/);
  });

  it('should check config argument', function() {
    assert.throws(() => {
      schema.addScalarType('scalar1', 123);
    }, /You must provide configuration object/);
  });

  it('should create scalar type', function() {
    schema.addScalarType('scalar1', {
      description: 'scalar1 desc',
      serialize: () => {},
      parseLiteral: () => {},
      parseValue: () => {}
    });
    const scalar1 = schema.types.get('scalar1');
    assert(scalar1);
    assert.strictEqual(scalar1.kind, 'scalar');
    assert.strictEqual(scalar1.description, 'scalar1 desc');
    assert.strictEqual(typeof scalar1.serialize, 'function');
    assert.strictEqual(typeof scalar1.parseLiteral, 'function');
    assert.strictEqual(typeof scalar1.parseValue, 'function');
  });

  it('should not allow duplicates', function() {
    assert.throws(() => {
      schema.addScalarType('scalar1', {values: {a: 1}});
    }, /already exists/);
  });

  it('should export (basic)', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.scalar1;
    assert.strictEqual(o.kind, 'scalar');
    assert.strictEqual(o.description, 'scalar1 desc');
    assert.strictEqual(typeof o.parseLiteral, 'function');
    assert.strictEqual(typeof o.parseValue, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    schema.addCall('scalar2.parseLiteral', () => true);
    schema.addCall('scalar2.parseValue', () => true);
    schema.addScalarType('scalar2', {
      parseLiteral: 'scalar2.parseLiteral',
      parseValue: 'scalar2.parseValue'
    });

    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.scalar2;
    assert.strictEqual(typeof o.parseLiteral, 'function');
    assert.strictEqual(typeof o.parseValue, 'function');
    assert.strictEqual(o.serialize, undefined);
  });

});
