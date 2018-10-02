const o = Object.assign({}, require('./starwars1.json'));

Object.assign(o, {

  resolvers: {
    Query: {
      lastEpisode: [
        'authorize',
        (parent, v, ctx, info) => {
          if (!ctx.authorized)
            throw new Error('Authorization not called');
          return 3;
        }]
    }
  }

});

module.exports = o;


