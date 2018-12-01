/* eslint-disable */
const assert = require('assert');
const {Schema} = require('../index');
const {graphql, GraphQLSchema} = require('graphql');

describe('Schema generate', function() {

  let schema;
  let qlschema;

  function execute(query) {
    return graphql(qlschema, query, null, {});
  }

  before(function() {
    schema = Schema.fromFile('./test/support/testapp.json', {context: {intoption: 1}});
  });

  it('should generate GraphQL schema', function() {
    qlschema = schema.generate({
      resolve: (_, __, ctx, info) => {
        info.modified = true;
      }
    });
    assert(qlschema instanceof GraphQLSchema, 'Failed');
  });

  describe('should execute multi resolvers', function() {

    it('Should not call "lastEpisode" before authenticated', function(done) {
      execute('{lastEpisode}')
          .then((v) => {
            if (v.errors && v.errors[0].message === 'Not authenticated')
              return done();
            done(v.errors);
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "authenticate"', function() {
      return execute('{login}').then((v) => {
        assert.strictEqual(v.data.login, 'authenticated');
      });
    });

    it('Should call "lastEpisode" after authenticated', function(done) {
      execute('{lastEpisode}')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "hello"', function(done) {
      execute('{hello}')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert.strictEqual(v.data.hello, 'world');
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "heroes"', function(done) {
      execute('{ heroes {id, name, notes} }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.heroes);
            assert.strictEqual(v.data.heroes.length, 2);
            assert.strictEqual(v.data.heroes[1].id, 2);
            assert.strictEqual(v.data.heroes[1].notes, '2');
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "heroes" with filter', function(done) {
      execute('{ heroes(filter:{id: "1"}){id, name, notes} }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.heroes);
            assert.strictEqual(v.data.heroes.length, 1);
            assert.strictEqual(v.data.heroes[0].id, 1);
            assert.strictEqual(v.data.heroes[0].name, 'Luke Skywalker');
            assert.strictEqual(v.data.heroes[0].notes, '1');
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "testfn" and return initializer options', function(done) {
      execute('{ testfn }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.testfn);
            assert.strictEqual(v.data.testfn, 1);
            done();
          })
          .catch((err) => done(err));
    });

  });

});
