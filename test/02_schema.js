/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../lib/index');

describe('Schema', function() {

  it('should construct', function() {
    new Schema();
  });

  it('should load object definition', function() {
    const schema1 = new Schema(require('./support/module1/schema1'));
    const episode = schema1.getType('Episode');
    const query = schema1.getType('Query');
    assert(episode);
    assert(query);
    assert.equal(episode.kind, 'enum');
    assert.equal(query.kind, 'object');
  });

  it('should add enum type', function() {
    const schema1 = new Schema();
    schema1.addEnumType('enum1', {
      values: {
        a: 1,
        b: 2
      }
    });
    assert.equal(schema1.getType('enum1').kind, 'enum');
  });

  it('should add input type', function() {
    const schema1 = new Schema();
    schema1.addInputType('input2', {
      fields: {
        a: 'Float'
      }
    });
    assert.equal(schema1.getType('input2').kind, 'input');
  });

  it('should add interface type', function() {
    const schema1 = new Schema();
    schema1.addInterfaceType('interface1', {
      fields: {
        a: 'Int'
      }
    });
    assert.equal(schema1.getType('interface1').kind, 'interface');
  });

  it('should add object type', function() {
    const schema1 = new Schema();
    schema1.addObjectType('object1', {
      fields: {
        a: 'Int'
      }
    });
    assert.equal(schema1.getType('object1').kind, 'object');
  });

  it('should add scalar type', function() {
    const schema1 = new Schema();
    schema1.addScalarType('scalar1', {
      serialize: () => {}
    });
    assert.equal(schema1.getType('scalar1').kind, 'scalar');
  });

  it('should add call', function() {
    const schema1 = new Schema();
    schema1.addCall('call1', () => true);
    assert.equal(typeof schema1.getCall('call1'), 'function');
  });

  it('should link other schema', function() {
    const schema1 = new Schema();
    const schema2 = new Schema();
    schema2.link('schema1', schema1);
    assert.equal(schema2.links.get('schema1'), schema1);
  });

  it('should not link self', function() {
    const schema1 = new Schema();
    try {
      schema1.link('schema1', schema1);
    } catch (e) {
      return;
    }
    assert(0, 'failed');
  });

  it('should second argument of link() must be Schema instance', function() {
    const schema1 = new Schema();
    try {
      schema1.link('schema1', 123);
    } catch (e) {
      return;
    }
    assert(0, 'failed');
  });

  it('should not use a namespace second time when linking', function() {
    const schema1 = new Schema();
    const schema2 = new Schema();
    schema2.link('schema1', schema1);
    try {
      schema2.link('schema1', schema1);
    } catch (e) {
      return;
    }
    assert(0, 'failed');
  });

  it('should addCall() accepts functions only', function() {
    try {
      const schema1 = new Schema();
      schema1.addCall('call1', true);
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should not add call more than one', function() {
    const schema1 = new Schema();
    schema1.addCall('call1', () => true);
    try {
      schema1.addCall('call1', () => true);
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should getType() throw error when given name not found', function() {
    const schema1 = new Schema();
    try {
      schema1.getType('unknowntype');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should getCall() throw error when given name not found', function() {
    const schema1 = new Schema();
    try {
      schema1.getCall('unknowncall');
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should load schema from json object', function() {
    let schema1 = new Schema();
    schema1.load({
      typeDefs: {
        UUID: {
          kind: 'scalar'
        },
        UUID2: {
          kind: 'scalar'
        },
        interface1: {
          kind: 'interface',
          fields: {
            a: 'String'
          }
        },
        object1: {
          kind: 'object',
          fields: {
            a: 'String'
          }
        },
        input1: {
          kind: 'input',
          fields: {
            a: 'String'
          }
        }
      },
      resolvers: {
        interface1: {
          ignoreThis: () => true
        },
        object1: {
          ignoreThis: () => true
        }
      }
    });
    assert.equal(schema1.getType('UUID').kind, 'scalar');

    schema1.load({
      calls: {
        a: () => true
      },
      resolvers: {
        UUID: {
          parseValue: () => true,
          parseLiteral: () => true,
          serialize: () => true
        },
        UUID2: {
          parseValue: () => true
        },
        interface1: {
          __resolveType: () => true
        },
        object1: {
          __isTypeOf: () => true,
          a: () => true
        }
      }
    });
    schema1.getCall('a');
    assert.equal(typeof schema1.getType('UUID').parseValue, 'function');
    assert.equal(typeof schema1.getType('UUID').parseLiteral, 'function');
    assert.equal(typeof schema1.getType('UUID').serialize, 'function');
    assert.equal(typeof schema1.getType('interface1').resolveType, 'function');
    assert.equal(typeof schema1.getType('object1').isTypeOf, 'function');
    assert.equal(typeof schema1.getType('object1').fields.get('a').resolve, 'function');
    schema1.getType('input1');
  });

  it('should validate argument of load() function', function() {
    const schema1 = new Schema();
    try {
      schema1.load([]);
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should getCall() throw error when given name not found', function() {
    let schema1 = new Schema();
    schema1.load({
      typeDefs: {
        Episode: {
          kind: 'enum'
        }
      }
    });
    const o = schema1.toJSON();
    assert.equal(typeof o, 'object');
    assert.equal(typeof o.typeDefs, 'object');
    assert.equal(typeof o.typeDefs.Episode, 'object');
    assert.equal(o.typeDefs.Episode.kind, 'enum');
  });

});