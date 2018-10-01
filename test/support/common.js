module.exports = (context) => {
  let authenticated;

  const o = Object.assign({}, require('./common.json'));

  Object.assign(o, {

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
        testfn: () => {
          return context.intoption;
        }
      }
    },

    calls: {
      hello: () => {
        return 'world';
      },
      authenticate: (parent, v, ctx, info) => {
        if (!authenticated)
          throw new Error('Not authenticated');
        if (!info.modified)
          throw new Error('Info is not modified');
      },
      ignoreThis: 123
    }

  });

  return o;

};
