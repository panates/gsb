/* eslint-disable */

const assert = require('assert');
const path = require('path');
const {Schema} = require('../index');

describe('Schema import', function() {

  it('should import types from json object', function() {
    let schema1 = new Schema();
    schema1.import({
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
      }
    });
    assert.strictEqual(schema1.getType('UUID').kind, 'scalar');
    assert.strictEqual(schema1.getType('UUID2').kind, 'scalar');
    assert.strictEqual(schema1.getType('interface1').kind, 'interface');
    assert.strictEqual(schema1.getType('object1').kind, 'object');
    assert.strictEqual(schema1.getType('input1').kind, 'input');
  });

  it('should import() ignore if argument is null', function() {
    let schema1 = new Schema();
    return schema1.import(null);
  });

  it('should import resolvers from separate json', function() {
    let schema1 = new Schema();
    schema1.import({
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
      }
    });
    schema1.import({
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
    assert.strictEqual(typeof schema1.getType('UUID').parseValue, 'function');
    assert.strictEqual(typeof schema1.getType('UUID').parseLiteral, 'function');
    assert.strictEqual(typeof schema1.getType('UUID').serialize, 'function');
    assert.strictEqual(typeof schema1.getType('interface1').resolveType, 'function');
    assert.strictEqual(typeof schema1.getType('object1').isTypeOf, 'function');
    assert.strictEqual(typeof schema1.getType('object1')
        .fields
        .get('a').resolve, 'function');
    schema1.getType('input1');
  });

  it('should throw error when type not found for resolver', function() {
    let schema = new Schema();
    assert.throws(() => {
      schema.import({
        resolvers: {
          UUID: {
            parseValue: () => true
          }
        }
      });
    }, /not found/);
  });

  it('should import "calls" from json object', function() {
    let schschemama1 = new Schema();
    schschemama1.import({
      calls: {
        call1: () => 1
      }
    });
    const call1 = schschemama1.getCall('call1');
    assert.strictEqual(typeof call1, 'function');
    assert.strictEqual(call1(), 1);
  });

  it('should import schema from file', function() {
    const schema1 = Schema.fromFile('starwars1', {rootPath: './test/support'});
    const episode = schema1.getType('Episode');
    const query = schema1.getType('Query');
    assert(episode);
    assert(query);
    assert.strictEqual(episode.kind, 'enum');
    assert.strictEqual(query.kind, 'object');
  });

  it('should manipulate filename using "readFile" option', function() {
    const schema = Schema.fromFile('starwars1', {
      readFile: (f) => path.resolve(__dirname, 'support', f)
    });
    const episode = schema.getType('Episode');
    const query = schema.getType('Query');
    assert(episode);
    assert(query);
    assert.strictEqual(episode.kind, 'enum');
    assert.strictEqual(query.kind, 'object');
  });

  it('should return array of file names in "readFile"', function() {
    const schema = Schema.fromFile('starwars1', {
      readFile: (f) => [path.resolve(__dirname, 'support', f)]
    });
    const episode = schema.getType('Episode');
    const query = schema.getType('Query');
    assert(episode);
    assert(query);
    assert.strictEqual(episode.kind, 'enum');
    assert.strictEqual(query.kind, 'object');
  });

  it('should return array of objects in "readFile"', function() {
    const schema = Schema.fromFile('starwars1', {
      readFile: (f) => [require(path.resolve(__dirname, 'support', f))]
    });
    const episode = schema.getType('Episode');
    const query = schema.getType('Query');
    assert(episode);
    assert(query);
    assert.strictEqual(episode.kind, 'enum');
    assert.strictEqual(query.kind, 'object');
  });

  it('should load file using "readFile" option', function() {
    const schema = Schema.fromFile('starwars1', {
      readFile: (f) => require(path.resolve(__dirname, path.join('support', f)))
    });
    const episode = schema.getType('Episode');
    const query = schema.getType('Query');
    assert(episode);
    assert(query);
    assert.strictEqual(episode.kind, 'enum');
    assert.strictEqual(query.kind, 'object');
  });

  it('should load linked schemas', function() {
    const schema = Schema.fromObject({
      namespace: 'tempschema',
      links: 'testapp.json'
    }, {rootPath: './test/support/'});
    assert.strictEqual(schema.links.size, 1);
    assert.strictEqual(schema.getSchema('tempschema'), schema);
    assert.strictEqual(schema.getSchema('starwars1', true).namespace, 'starwars1');
    assert.strictEqual(schema.getSchema('common', true).namespace, 'common');
    assert.strictEqual(schema.getType('UID', true).kind, 'scalar');
    assert(schema.getCall('jedi', true), 'Failed');
    assert.strictEqual(schema.getCall('jedi', true)(), 'jedi');
  });

  it('should validate argument is string in .fromFile(arg)', function() {
    assert.throws(() => {
      Schema.fromFile(123);
    }, /You must provide file path/);
  });

  it('should validate argument is string in .fromObject(arg)', function() {
    assert.throws(() => {
      Schema.fromObject(123);
    }, /You must provide an object instance/);
  });

  it('should validate file', function() {
    assert.throws(() => {
      Schema.fromFile('./test/support/invalid_schema.js');
    }, /Can't load schema file/);
  });

});
