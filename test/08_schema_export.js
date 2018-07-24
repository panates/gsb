/* eslint-disable */
const assert = require('assert');
const path = require('path');
const {SchemaLoader, Schema} = require('../index');

const fileMapper = (v) => path.resolve('test/support', v);

describe('Schema Export', function() {

  let schema;

  before(async function() {
    schema = new Schema();
    await schema.load({
      link: ['module2/schema2', 'module3/schema3']
    }, fileMapper);
  });

  it('should export (EXPORT_GSB)', function() {
    const o = schema.export();
    assert.equal(typeof o, 'object');
    assert(Array.isArray(o.link), 'Failed');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    assert.equal(typeof o, 'object');
    assert.equal(typeof o.typeDefs, 'object');
    assert(!o.link, 'Failed');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_PURE});
    assert.equal(typeof o, 'object');
    assert.equal(typeof o.typeDefs, 'object');
    assert(!o.link, 'Failed');
  });

});