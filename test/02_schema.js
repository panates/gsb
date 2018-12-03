/* eslint-disable */

const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('SchemaBuilder', function() {

  it('should construct', function() {
    new SchemaBuilder();
  });

  it('should add enum type', function() {
    const schema = new SchemaBuilder();
    schema.addEnumType('enum1', {
      values: {
        a: 1,
        b: 2
      }
    });
    assert.strictEqual(schema.getType('enum1').kind, 'enum');
  });

  it('should add input type', function() {
    const schema = new SchemaBuilder();
    schema.addInputType('input2', {
      fields: {
        a: 'Float'
      }
    });
    assert.strictEqual(schema.getType('input2').kind, 'input');
  });

  it('should add interface type', function() {
    const schema = new SchemaBuilder();
    schema.addInterfaceType('interface1', {
      fields: {
        a: 'Int'
      }
    });
    assert.strictEqual(schema.getType('interface1').kind, 'interface');
  });

  it('should add object type', function() {
    const schema1 = new SchemaBuilder();
    schema1.addObjectType('object1', {
      fields: {
        a: 'Int'
      }
    });
    assert.strictEqual(schema1.getType('object1').kind, 'object');
  });

  it('should add scalar type', function() {
    const schema = new SchemaBuilder();
    schema.addScalarType('scalar1', {
      serialize: () => {}
    });
    assert.strictEqual(schema.getType('scalar1').kind, 'scalar');
  });

  it('should add call', function() {
    const schema = new SchemaBuilder();
    schema.addCall('call1', () => true);
    assert.strictEqual(typeof schema.getCall('call1'), 'function');
  });

  it('should link other schema', function() {
    const schema1 = new SchemaBuilder('schema1');
    const schema2 = new SchemaBuilder('schema2');
    schema2.link(schema1);
    assert.strictEqual(schema2.getSchema('schema1'), schema1);
  });

  it('should not link other than SchemaBuilder instance', function() {
    const schema1 = new SchemaBuilder('schema1');
    assert.throws(() => {
      schema1.link(123);
    }, /You must provide a Schema instance/);
  });
  it('should not link if SchemaBuilder namespace is null', function() {
    const schema1 = new SchemaBuilder('schema1');
    const schema2 = new SchemaBuilder();
    assert.throws(() => {
      schema1.link(schema2);
    }, /Schema must have a namespace to link/);
  });
  it('should do nothing when linking an already linked schema', function() {
    const schema1 = new SchemaBuilder('schema1');
    const schema2 = new SchemaBuilder('schema2');
    schema2.link(schema1);
    schema2.link(schema1);
    assert.strictEqual(schema2.getSchema('schema1'), schema1);
    assert.strictEqual(schema2.links.size, 1);
  });

  it('should not link itself', function() {
    const schema1 = new SchemaBuilder('schema1');
    assert.throws(() => {
      schema1.link(schema1);
    }, /Can't link self/);
  });

  it('should not use a namespace second time when linking', function() {
    const schema1 = new SchemaBuilder('schema1');
    const schema2 = new SchemaBuilder('schema2');
    const schema3 = new SchemaBuilder('schema2');
    schema1.link(schema2);
    assert.throws(() => {
      schema1.link(schema3);
    }, /with same name/);
  });

  it('should addCall() accepts functions only', function() {
    assert.throws(() => {
      const schema1 = new SchemaBuilder();
      schema1.addCall('call1', true);
    }, /You must provide function instance/);
  });

  it('should not add call more than one', function() {
    const schema1 = new SchemaBuilder();
    schema1.addCall('call1', () => true);
    assert.throws(() => {
      schema1.addCall('call1', () => true);
    }, /already exists/);
  });

  it('should find a "type" recursively', function() {
    const schema1 = new SchemaBuilder('schema1');
    schema1.addObjectType('object1', {
      fields: {
        a: 'Int'
      }
    });
    const object1 = schema1.getType('object1', true);
    assert.strictEqual(object1.kind, 'object');
  });

  it('should find a "call" recursively', function() {
    const schema1 = new SchemaBuilder('schema1');
    schema1.addCall('call1', () => 0);
    const call1 = schema1.getCall('call1', true);
    assert.strictEqual(typeof call1, 'function');
  });

  it('should validate argument for import() function', function() {
    const schema1 = new SchemaBuilder();
    assert.throws(() => {
      schema1.import(123);
    }, /You must provide an object instance/);
  });

});
