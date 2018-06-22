/* eslint-disable */
const assert = require('assert');
const {SchemaLoader} = require('../lib/index');

describe('SchemaLoader', function() {

  it('should construct', function() {
    new SchemaLoader();
  });

  it('should load files by path string', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load('module1/schema1', (err, schema) => {
      if (err)
        return done(err);
      assert.equal(schema.getType('Character').kind, 'interface');
      done();
    });
  });

  it('should load from object instance', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load(require('./support/module2/schema2'), (err, schema) => {
      if (err)
        return done(err);
      assert.equal(schema.getType('Episode').kind, 'enum');
      done();
    });
  });

  it('should skip if arg is null', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load(null, (err, schema) => {
      if (err)
        return done(err);
      done();
    });
  });

  it('should load return Promise', function(done) {
    const loader = new SchemaLoader('./support');
    const promise = loader.load('module1/schema1');
    promise.then(() => {
      done();
    }).catch((e) => done(e));
  });

  it('should load linked schemas', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load('module2/schema2', (err, schema) => {
      if (err)
        return done(err);
      assert.equal(schema.links.size, 1);
      done();
    });
  });

  it('should load use custom loader function', function(done) {
    const loader = new SchemaLoader((n) => {
      if (n === 'schema1')
        return './support/module1/schema1';
      return './support/module2/schema2';
    });
    loader.load('schema1', (err, schema) => {
      if (err)
        return done(err);
      assert.equal(schema.getType('Episode').kind, 'enum');
      done();
    });
  });

  it('should cancel load when custom loader returned error', function(done) {
    const loader = new SchemaLoader((n, cb) => {
      cb('Any error')
    });
    loader.load('schema1', (err, schema) => {
      if (err)
        return done();
      done('Failed');
    });
  });

  it('should cancel load when custom loader throw error', function(done) {
    const loader = new SchemaLoader((n, cb) => {
      throw new Error('Any error');
    });
    loader.load('schema1', (err, schema) => {
      if (err)
        return done();
      done('Failed');
    });
  });

  it('should throw error when loaded file does not return object instance', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load('module1/invalid_schema', (err) => {
      if (err)
        return done();
      done('Failed');
    });
  });

  it('should throw error when linked file does not return object instance', function(done) {
    const loader = new SchemaLoader('./support');
    loader.load({
      link: ['module1/invalid_schema']
    }, (err) => {
      if (err)
        return done();
      done('Failed');
    });
  });

});