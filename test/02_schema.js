/* eslint-disable */

const assert = require('assert');
const path = require('path');
const promisify = require('putil-promisify');
const {Schema} = require('../index');

const fileMapper = (v) => path.resolve('test/support', v);

describe('Schema', function() {

  it('should construct', function() {
    new Schema();
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

  it('should initialize with definition', function() {
    const schema1 = new Schema(require('./support/module1/schema1'));
    const episode = schema1.getType('Episode');
    const query = schema1.getType('Query');
    assert(episode);
    assert(query);
    assert.equal(episode.kind, 'enum');
    assert.equal(query.kind, 'object');
  });

  it('should load schema from json object', async function() {
    let schema1 = new Schema();
    await schema1.load({
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

    await schema1.load({
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
    assert.equal(typeof schema1.getType('object1')
        .fields
        .get('a').resolve, 'function');
    schema1.getType('input1');
  });

  it('should getCall() throw error when given name not found', async function() {
    let schema1 = new Schema();
    await schema1.load({
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

  it('should validate argument of load() function', async function() {
    const schema1 = new Schema();
    try {
      await schema1.load([]);
    } catch (e) {
      return;
    }
    assert(0, 'Failed');
  });

  it('should load return Promise', function() {
    const schema = new Schema();
    const promise = schema.load('module1/schema1', fileMapper);
    assert(promisify.isPromise(promise), 'Failed');
  });

  it('should load files by path string', async function() {
    const schema = new Schema();
    await schema.load('module1/schema1', fileMapper);
    assert.equal(schema.getType('Character').kind, 'interface');
  });

  it('should load from object instance', async function() {
    const schema = new Schema();
    await schema.load(require('./support/module2/schema2'), fileMapper);
    assert.equal(schema.getType('Episode').kind, 'enum');
  });

  it('should skip if arg is null', async function() {
    const schema = new Schema();
    await schema.load(null);
  });

  it('should load linked schemas', async function() {
    const schema = new Schema();
    await schema.load('module2/schema2', fileMapper);
    assert.equal(schema.links.size, 1);
  });

  it('should cancel load when custom loader throws error', function(done) {
    const schema = new Schema();
    const p = schema.load('schema1', (n) => {
      throw new Error('Any error');
    });
    p.then(() => done('Failed'))
        .catch(() => done());
  });

  it('should cancel load when custom loader returns rejected promise', function(done) {
    const schema = new Schema();
    const p = schema.load('schema1', (n) => {
      return Promise.reject(new Error('Any error'));
    });
    p.then(() => done('Failed'))
        .catch(() => done());
  });

  it('should throw error when loaded file does not return object instance', function(done) {
    const schema = new Schema();
    const p = schema.load('module1/invalid_schema', fileMapper);
    p.then(() => done('Failed'))
        .catch(() => done());
  });

  it('should throw error when linked file does not return object instance', function(done) {
    const schema = new Schema();
    const p = schema.load({
      link: ['module1/invalid_schema']
    }, fileMapper);
    p.then(() => done('Failed'))
        .catch(() => done());
  });

  it('should load all if load callback returns array', async function() {
    const schema = new Schema();
    await schema.load('*', (v) => {
      if (v === '*') {
        return ['module1/schema1', 'module1/schema2'];
      }
      return fileMapper(v);
    });
    const episode = schema.getType('Episode');
    const query = schema.getType('Query');
    assert(episode);
    assert(query);
    assert.equal(episode.kind, 'enum');
    assert.equal(query.kind, 'object');
  });

});