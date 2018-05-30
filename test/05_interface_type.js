/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../lib/index');

describe('InterfaceType', function() {

  const schema = new Schema();

  it('should check name argument', function() {
    try {
      schema.addInterfaceType('', {});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should check config argument', function() {
    try {
      schema.addInterfaceType('interface1');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
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
    assert.equal(v.kind, 'interface');
    assert.equal(v.description, 'interface1 desc');
    assert.equal(v.fields.size, 3);
    assert.equal(v.fields.get('a').type, 'Int');
    assert.equal(v.fields.get('b').type, 'String');
    assert.equal(v.fields.get('b').description, 'desc');
    assert.equal(v.fields.get('b').deprecationReason, 'dept');
    assert.equal(v.resolveType(), 'one');
    v = schema.getType('interface10');
    assert.equal(v.extends, 'interface1');
    v = schema.getType('interface11');
    assert.deepEqual(v.extends, ['interface1', 'interface2']);
  });

  it('should not allow duplicates', function() {
    try {
      schema.addInterfaceType('interface1', {fields: {a: 'Int'}});
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should validate value name', function() {
    try {
      schema.addInterfaceType('interface3', {fields: {'1a': 'Int'}});
    } catch (e) {
      if (e.message.includes('Invalid'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should export (EXPORT_GSB) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.interface1;
    assert.equal(o.kind, 'interface');
    assert.equal(o.description, 'interface1 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'}
    });
    assert.equal(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GSB) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.interface10;
    assert.deepEqual(o, {
      description: 'interface10 desc',
      kind: 'interface',
      extends: 'interface1',
      fields: {f: {type: 'Int'}}
    });
  });

  it('should export (EXPORT_GSB) - 3', function() {
    const def = schema.export({format: Schema.EXPORT_GSB});
    const o = def.typeDefs.interface11;
    assert.deepEqual(o, {
      description: 'interface11 desc',
      kind: 'interface',
      extends: ['interface1', 'interface2']
    });
  });

  it('should export (EXPORT_GQL_SIMPLE) - 1', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.interface10;
    assert.equal(o.kind, 'interface');
    assert.equal(o.description, 'interface10 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'},
      f: {type: 'Int'}
    });
    assert.equal(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GQL_SIMPLE) - 2', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    const o = def.typeDefs.interface11;
    assert.equal(o.kind, 'interface');
    assert.equal(o.description, 'interface11 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      c: {type: 'Float'},
      e: {type: 'Int'}
    });
    assert.equal(typeof o.resolveType, 'function');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const def = schema.export({format: Schema.EXPORT_GQL_PURE});
    const o = def.typeDefs.interface10;
    assert.equal(o.kind, 'interface');
    assert.equal(o.description, 'interface10 desc');
    assert.deepEqual(o.fields, {
      a: {type: 'Int'},
      b: {type: 'String', description: 'desc', deprecationReason: 'dept'},
      e: {type: 'Int'},
      f: {type: 'Int'}
    });
    assert.equal(o.resolveType, undefined);
    assert.equal(typeof def.resolvers.interface10, 'object');
    assert.equal(typeof def.resolvers.interface10.__resolveType, 'function');
  });

  it('should extend from Interface type only', function() {
    schema.addEnumType('enum1', {values: {a: 1, b: 2}});

    schema.addInterfaceType('interface20', {
      extends: 'enum1'
    });

    try {
      const v = schema.items.get('interface20');
      let o = v.export({format: Schema.EXPORT_GQL_SIMPLE});
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

});