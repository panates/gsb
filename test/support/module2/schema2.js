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
      hero: () => {}
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
