/* eslint-disable */
const assert = require('assert');
const path = require('path');
const {Schema} = require('../index');
const {graphql, GraphQLSchema} = require('graphql');

const opts = {rootPath: path.resolve('./test/support'), intoption: 1};

describe('Schema Export', function() {

  let schema;
  let qlschema;

  before(async function() {
    schema = new Schema();
    await schema.load('module2/schema2', opts);
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
      graphql(qlschema, '{lastEpisode}')
          .then((v) => {
            if (v.errors && v.errors[0].message === 'Not authenticated')
              return done();
            done(v.errors);
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "authenticate"', function() {
      return graphql(qlschema, '{login}');
    });

    it('Should call "lastEpisode" after authenticated', function(done) {
      graphql(qlschema, '{lastEpisode}')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "hello"', function(done) {
      graphql(qlschema, '{hello}')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert.equal(v.data.hello, 'world');
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "heroes"', function(done) {
      graphql(qlschema, '{ heroes {id, name, notes} }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.heroes);
            assert.equal(v.data.heroes.length, 2);
            assert.equal(v.data.heroes[1].id, 2);
            assert.equal(v.data.heroes[1].notes, 2);
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "heroes" with filter', function(done) {
      graphql(qlschema, '{ heroes(filter:{id: "1"}){id, name, notes} }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.heroes);
            assert.equal(v.data.heroes.length, 1);
            assert.equal(v.data.heroes[0].id, 1);
            assert.equal(v.data.heroes[0].name, 'Luke Skywalker');
            assert.equal(v.data.heroes[0].notes, 1);
            done();
          })
          .catch((err) => done('Failed:' + err.message));
    });

    it('Should call "testfn" and return initializer options', function(done) {
      graphql(qlschema, '{ testfn }')
          .then((v) => {
            if (v.errors)
              return done(v.errors);
            assert(v.data.testfn);
            assert.equal(v.data.testfn, 1);
            done();
          })
          .catch((err) => done(err));
    });

  });

});