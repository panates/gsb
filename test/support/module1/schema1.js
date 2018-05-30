module.exports = require('./schema1.json');

let authenticated;

Object.assign(module.exports, {

  resolvers: {
    UID: {
      serialize: (value) => {
        return value;
      },
      parseValue(value) {
        return value;
      },
      parseLiteral(ast) {
        return ast.value;
      }
    },
    Query: {
      login: () => {
        authenticated = true;
      },
      lastEpisode: [
        'authenticate',
        () => {
          return 'EPISODE_III';
        }]
    }
  },

  calls: {
    hello: () => {
      return 'world';
    },
    authenticate: (parent, v) => {
      if (!authenticated)
        throw new Error('Not authenticated');
    },
    ignoreThis: 123
  }

});
