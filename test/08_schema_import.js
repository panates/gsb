/* eslint-disable */

const assert = require('assert');
const path = require('path');
const {Schema} = require('../index');

describe('Schema import', function() {

  it('should import types from json object', function() {
    let schema1 = new Schema();
    return schema1.import({
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
    }).then(() => {
      assert.equal(schema1.getType('UUID').kind, 'scalar');
      assert.equal(schema1.getType('UUID2').kind, 'scalar');
      assert.equal(schema1.getType('interface1').kind, 'interface');
      assert.equal(schema1.getType('object1').kind, 'object');
      assert.equal(schema1.getType('input1').kind, 'input');
    });
  });

  it('should import() ignore if argument is null', function() {
    let schema1 = new Schema();
    return schema1.import(null);
  });

  it('should import resolvers from separate json', function() {
    let schema1 = new Schema();
    return schema1.import({
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
    }).then(() => {
      return schema1.import({
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
      }).then(() => {
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
    });
  });

  it('should throw error when type not found for resolver', function(done) {
    let schema1 = new Schema();
    schema1.import({
      resolvers: {
        UUID: {
          parseValue: () => true
        }
      }
    }).then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('not found'))
            return done();
          return done(e);
        });
  });

  it('should import "calls" from json object', function() {
    let schema1 = new Schema();
    return schema1.import({
      calls: {
        call1: () => 1
      }
    }).then(() => {
      const call1 = schema1.getCall('call1');
      assert.equal(typeof call1, 'function');
      assert.equal(call1(), 1);
    });
  });

  it('should import schema from file', function() {
    return Schema.fromFile('starwars1', {rootPath: './test/support'})
        .then(schema1 => {
          const episode = schema1.getType('Episode');
          const query = schema1.getType('Query');
          assert(episode);
          assert(query);
          assert.equal(episode.kind, 'enum');
          assert.equal(query.kind, 'object');
        });
  });

  it('should manipulate filename using "readFile" option', function() {
    return Schema.fromFile('starwars1',
        {
          readFile: (f) => {
            return path.resolve(__dirname, 'support', f);
          }
        })
        .then(schema1 => {
          const episode = schema1.getType('Episode');
          const query = schema1.getType('Query');
          assert(episode);
          assert(query);
          assert.equal(episode.kind, 'enum');
          assert.equal(query.kind, 'object');
        });
  });

  it('should return array of file names in "readFile"', function() {
    return Schema.fromFile('starwars1',
        {
          readFile: (f) => {
            return [path.resolve(__dirname, 'support', f)];
          }
        })
        .then(schema1 => {
          const episode = schema1.getType('Episode');
          const query = schema1.getType('Query');
          assert(episode);
          assert(query);
          assert.equal(episode.kind, 'enum');
          assert.equal(query.kind, 'object');
        });
  });

  it('should return array of objects in "readFile"', function() {
    return Schema.fromFile('starwars1',
        {
          readFile: (f) => {
            return [require(path.resolve(__dirname, 'support', f))];
          }
        })
        .then(schema1 => {
          const episode = schema1.getType('Episode');
          const query = schema1.getType('Query');
          assert(episode);
          assert(query);
          assert.equal(episode.kind, 'enum');
          assert.equal(query.kind, 'object');
        });
  });

  it('should load file using "readFile" option', function() {
    return Schema.fromFile('starwars1',
        {
          readFile: (f) => {
            return require(path.resolve(__dirname, path.join('support', f)));
          }
        })
        .then(schema => {
          const episode = schema.getType('Episode');
          const query = schema.getType('Query');
          assert(episode);
          assert(query);
          assert.equal(episode.kind, 'enum');
          assert.equal(query.kind, 'object');
        });
  });

  it('should load linked schemas', function() {
    return Schema.fromObject({
      namespace: 'tempschema',
      links: 'testapp.json'
    }, {rootPath: './test/support/'}).then(schema => {
      assert.equal(schema.links.size, 1);
      assert.equal(schema.getSchema('tempschema'), schema);
      assert.equal(schema.getSchema('starwars1', true).namespace, 'starwars1');
      assert.equal(schema.getSchema('common', true).namespace, 'common');
      assert.equal(schema.getType('UID', true).kind, 'scalar');
      assert(schema.getCall('jedi', true), 'Failed');
      assert.equal(schema.getCall('jedi', true)(), 'jedi');
    });
  });

  it('should load fail when readFile returns rejected promise', function(done) {
    Schema.fromFile('./test/support/starwars1',
        {readFile: () => Promise.reject(new Error('Any reason'))})
        .then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('Any reason'))
            return done();
          return done(e);
        });
  });

  it('should validate argument is string in .fromFile(arg)', function(done) {
    Schema.fromFile(123)
        .then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('You must provide file path'))
            return done();
          return done(e);
        });
  });

  it('should validate argument is string in .fromObject(arg)', function(done) {
    Schema.fromObject(123)
        .then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('You must provide an object instance'))
            return done();
          return done(e);
        });
  });

  it('should validate file', function(done) {
    Schema.fromFile('./test/support/invalid_schema.js')
        .then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('Can\'t load schema file'))
            return done();
          return done(e);
        });
  });

});