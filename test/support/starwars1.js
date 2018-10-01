const o = Object.assign({}, require('./starwars1.json'));

Object.assign(o, {

  resolvers: {
    Query: {
      lastEpisode: [
        'authenticate',
        () => 3]
    }
  }

});

module.exports = o;


