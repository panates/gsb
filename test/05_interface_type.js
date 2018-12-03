/* eslint-disable */
const assert = require('assert');
const {SchemaBuilder} = require('../index');

describe('InterfaceType', function() {

  const schema = new SchemaBuilder();

  it('should check name argument', function() {
    assert.throws(() => {
      schema.addInterfaceType('', {});
    }, /Invalid type name/);
  });

  it('should check config argument', function() {
    assert.throws(() => {
      schema.addInterfaceType('interface1');
    }, /You must provide configuration object/);
  });

  it('should create interface type', function() {
    schema.addInterfaceType('interface1', {
      description: 'interface1 desc',
      fields: {
        a: 'Int',
        b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
        e: 'Int'
      },
      resolveType: () => {return 'one';}
    });
    schema.addInterfaceType('interface2', {
      description: 'interface2 desc',
      fields: {
        c: 'Float'
      },
      resolveType: () => {return 'two';}
    });
    schema.addInterfaceType('interface10', {
      description: 'interface10 desc',
      extends: 'interface1',
      fields: {
        f: 'Int'
      }
    });
    schema.addInterfaceType('interface11', {
      description: 'interface11 desc',
      extends: ['interface1', 'interface2']
    });
    let v = schema.getType('interface1');
    assert.strictEqual(v.kind, 'interface');
    assert.strictEqual(v.description, 'interface1 desc');
    assert.strictEqual(v.fields.size, 3);
    assert.strictEqual(v.fields.get('a').type, 'Int');
    assert.strictEqual(v.fields.get('b').type, 'String');
    assert.strictEqual(v.fields.get('b').description, 'desc');
    assert.strictEqual(v.fields.get('b').deprecationReason, 'dept');
    assert.strictEqual(v.resolveType(), 'one');
    v = schema.getType('interface10');
    assert.strictEqual(v.extends, 'interface1');
    v = schema.getType('interface11');
    assert.deepStrictEqual(v.extends, ['interface1', 'interface2']);
  });

  it('should not allow duplicates', function() {
    assert.throws(() => {
      schema.addInterfaceType('interface1', {fields: {a: 'Int'}});
    }, /already exists/);
  });

  it('should validate value name', function() {
    assert.throws(() => {
      schema.addInterfaceType('interface3', {fields: {'1a': 'Int'}});
    }, /Invalid field name/);
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.interface1;
    assert.strictEqual(o.kind, 'interface');
    assert.strictEqual(o.description, 'interface1 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'}
    });
    assert.strictEqual(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.interface10;
    assert.deepStrictEqual(o, {
      description: 'interface10 desc',
      kind: 'interface',
      extends: 'interface1',
      fields: {f: {type: 'Int'}}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GSB});
    const o = def.typeDefs.interface11;
    assert.deepStrictEqual(o, {
      description: 'interface11 desc',
      kind: 'interface',
      extends: ['interface1', 'interface2']
    });
  });

  it('should export (EXPORT_GQL_SIMPLE) - 1', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.interface10;
    assert.strictEqual(o.kind, 'interface');
    assert.strictEqual(o.description, 'interface10 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'},
      f: {type: 'Int'}
    });
    assert.strictEqual(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE) - 2', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.interface11;
    assert.strictEqual(o.kind, 'interface');
    assert.strictEqual(o.description, 'interface11 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      c: {type: 'Float'},
      e: {type: 'Int'}
    });
    assert.strictEqual(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const def = schema.export({format: SchemaBuilder.EXPORT_GQL_PURE});
    const o = def.typeDefs.interface10;
    assert.strictEqual(o.kind, 'interface');
    assert.strictEqual(o.description, 'interface10 desc');
    assert.deepStrictEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'},
      f: {type: 'Int'}
    });
    assert.strictEqual(o.resolveType, undefined);
    assert.strictEqual(typeof def.resolvers.interface10, 'object');
    assert.strictEqual(typeof def.resolvers.interface10.__resolveType, 'function');
  });

  it('should extend from Interface type only', function() {
    schema.addEnumType('enum1', {values: {a: 1, b: 2}});

    schema.addInterfaceType('interface20', {
      extends: 'enum1'
    });

    assert.throws(() => {
      const v = schema.types.get('interface20');
      v.export({format: SchemaBuilder.EXPORT_GQL_SIMPLE});
    }, /export is not a function/);

  });

});
