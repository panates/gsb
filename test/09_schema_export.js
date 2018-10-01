/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../index');
const fs = require('fs');
const path = require('path');

describe('Schema export', function() {

  let schema;

  before(function() {
    return Schema.fromFile('./test/support/testapp.json')
        .then(sch => schema = sch);
  });

  it('should export (EXPORT_GSB)', function() {
    const o = schema.toJSON();
    assert.equal(typeof o, 'object');
    assert(Array.isArray(o.links), 'Failed');
  });

  it('should export (EXPORT_GQL_SIMPLE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_SIMPLE});
    assert.equal(typeof o, 'object');
    assert.equal(typeof o.typeDefs, 'object');
    assert(!o.links, 'Failed');
  });

  it('should export (EXPORT_GQL_PURE)', function() {
    const o = schema.export({format: Schema.EXPORT_GQL_PURE});
    assert.equal(typeof o, 'object');
    assert.equal(typeof o.typeDefs, 'object');
    assert(!o.links, 'Failed');
  });

});