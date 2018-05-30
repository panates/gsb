/* eslint-disable */
const assert = require('assert');
const {SchemaLoader, Schema} = require('../lib/index');
const {GraphQLSchema} = require('graphql');

describe('Schema Export', function() {

  let schema;
  let qlschema;

  before(function(done) {
    const loader = new SchemaLoader('./test/support');
    loader.load(require('./support/module2/schema2'), (err, sch) => {
      if (err)
        return done(err);
      schema = sch;
      done();
    });
  });

  it('should generate GraphQL schema', function() {
    qlschema = schema.generate();
    assert(qlschema instanceof GraphQLSchema, 'Failed');
  });

});