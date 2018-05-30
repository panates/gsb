/* eslint-disable */
const assert = require('assert');
const {SchemaLoader, Schema} = require('../lib/index');

describe('Schema Export', function() {

  let schema;

  before(function(done) {
    const loader = new SchemaLoader('./test/support');
    loader.load({
          link: ['module2/schema2', 'module3/schema3']
        },
        (err, sch) => {
          if (err)
            return done(err);
          schema = sch;
          done();
        });
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