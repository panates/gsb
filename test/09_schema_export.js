/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../index');

describe('Schema export', function() {

  let schema;

  before(function() {
    schema = Schema.fromFile('./test/support/testapp.json');
  });

  it('should export (EXPORT_GSB)', function() {
    const o = schema.toJSON();
    assert.strictEqual(typeof o, 'object');
    assert(Array.isArray(o.links), 'Failed');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    assert.strictEqual(typeof o, 'object');
    assert.strictEqual(typeof o.typeDefs, 'object');
    assert(!o.links, 'Failed');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_PURE});
    assert.strictEqual(typeof o, 'object');
    assert.strictEqual(typeof o.typeDefs, 'object');
    assert(!o.links, 'Failed');
  });

});
