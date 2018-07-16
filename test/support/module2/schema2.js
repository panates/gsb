module.exports = require('./schema2.json');

Object.assign(module.exports, {

  resolvers: {
    Query: {
      lastEpisode: () => {
        return new Promise((resolve) => {
          resolve('EPISODE_V');
        });
      },
      droid: () => {},
      jedi: 'jedi',
      hero: () => {},
      heroes: [
        (parent, args) => {
          return Promise.resolve(
              !args.filter || args.filter.id == 1 ?
                  [{id: 1, name: 'Luke Skywalker', notes: 1}] : []);
        },
        (parent, args, ctx, info) => {
          if (!args.filter || args.filter.id == 2)
            info.response.push({id: 2, name: 'Han Solo', notes: 2});
        }]
    },
    Droid: {
      __isTypeOf: () => true
    },
    Jedi: {
      __isTypeOf: [() => true]
    }
  },

  calls: {
    jedi: () => {
      return 'jedi';
    }
  }

});
