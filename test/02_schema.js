/* eslint-disable */

const assert = require('assert');
const path = require('path');
const promisify = require('putil-promisify');
const {Schema} = require('../index');

describe('Schema', function() {

  it('should construct', function() {
    new Schema();
  });

  it('should add enum type', function() {
    const schema = new Schema();
    schema.addEnumType('enum1', {
      values: {
        a: 1,
        b: 2
      }
    });
    assert.equal(schema.getType('enum1').kind, 'enum');
  });

  it('should add input type', function() {
    const schema = new Schema();
    schema.addInputType('input2', {
      fields: {
        a: 'Float'
      }
    });
    assert.equal(schema.getType('input2').kind, 'input');
  });

  it('should add interface type', function() {
    const schema = new Schema();
    schema.addInterfaceType('interface1', {
      fields: {
        a: 'Int'
      }
    });
    assert.equal(schema.getType('interface1').kind, 'interface');
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
    const schema = new Schema();
    schema.addScalarType('scalar1', {
      serialize: () => {}
    });
    assert.equal(schema.getType('scalar1').kind, 'scalar');
  });

  it('should add call', function() {
    const schema = new Schema();
    schema.addCall('call1', () => true);
    assert.equal(typeof schema.getCall('call1'), 'function');
  });

  it('should link other schema', function() {
    const schema1 = new Schema('schema1');
    const schema2 = new Schema('schema2');
    schema2.link(schema1);
    assert.equal(schema2.getSchema('schema1'), schema1);
  });

  it('should not link other than Schema instance', function() {
    const schema1 = new Schema('schema1');
    try {
      schema1.link(123);
    } catch (e) {
      if (e.message.includes('You must provide a Schema instance'))
        return;
      throw e;
    }
  });

  it('should do nothing when linking an already linked schema', function() {
    const schema1 = new Schema('schema1');
    const schema2 = new Schema('schema2');
    schema2.link(schema1);
    schema2.link(schema1);
    assert.equal(schema2.getSchema('schema1'), schema1);
    assert.equal(schema2.links.size, 1);
  });

  it('should not link itself', function() {
    const schema1 = new Schema('schema1');
    try {
      schema1.link(schema1);
    } catch (e) {
      if (e.message.includes('Can\'t link self'))
        return;
      throw e;
    }
    assert(0, 'failed');
  });

  it('should not use a namespace second time when linking', function() {
    const schema1 = new Schema('schema1');
    const schema2 = new Schema('schema2');
    const schema3 = new Schema('schema2');
    schema1.link(schema2);
    try {
      schema1.link(schema3);
    } catch (e) {
      if (e.message.includes('A schema with same name'))
        return;
      throw e;
    }
    assert(0, 'failed');
  });

  it('should addCall() accepts functions only', function() {
    try {
      const schema1 = new Schema();
      schema1.addCall('call1', true);
    } catch (e) {
      if (e.message.includes('You must provide function instance'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should not add call more than one', function() {
    const schema1 = new Schema();
    schema1.addCall('call1', () => true);
    try {
      schema1.addCall('call1', () => true);
    } catch (e) {
      if (e.message.includes('already exists'))
        return;
      throw e;
    }
    assert(0, 'Failed');
  });

  it('should find a "type" recursively', function() {
    const schema1 = new Schema('schema1');
    const schema2 = new Schema('schema2');
    schema1.addObjectType('object1', {
      fields: {
        a: 'Int'
      }
    });
    const object1 = schema1.getType('object1', true);
    assert.equal(object1.kind, 'object');
  });

  it('should find a "call" recursively', function() {
    const schema1 = new Schema('schema1');
    const schema2 = new Schema('schema2');
    schema1.addCall('call1', () => 0);
    const call1 = schema1.getCall('call1', true);
    assert.equal(typeof call1, 'function');
  });

  it('should import return Promise', function() {
    const schema = new Schema();
    const promise = schema.import(require('./support/common.json'));
    assert(promisify.isPromise(promise), 'Failed');
    return promise;
  });

  it('should validate argument for import() function', function(done) {
    const schema1 = new Schema();
    schema1.import(123)
        .then(() => done('Failed'))
        .catch(e => {
          if (e.message.includes('You must provide an object instance'))
            return done();
          throw done(e);
        });
  });

});