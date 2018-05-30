/* eslint-disable */
const assert = require('assert');
const {
  parseInputTypeString,
  parseTypeString,
  makeArray,
  mergeCalls
} = require('../lib/helpers');
const XMap = require('../lib/XMap');

describe('common', function() {

  describe('helpers', function() {

    describe('parseTypeString()', function() {

      it('should parse: String', function() {
        const o = parseTypeString('String');
        assert.equal(o.type, 'String');
        assert(!o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: String!', function() {
        const o = parseTypeString('String!');
        assert.equal(o.type, 'String');
        assert(o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: [String!]!', function() {
        const o = parseTypeString('[String!]!');
        assert.equal(o.type, 'String');
        assert(o.nonNull);
        assert(o.list);
        assert(o.nonNullItems);
      });

      it('should check empty arg', function() {
        try {
          parseTypeString();
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });

      it('should check valid arg', function() {
        try {
          parseTypeString('[dfds');
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });
    });

    describe('parseInputTypeString()', function() {

      it('should parse: String', function() {
        const o = parseInputTypeString('String = 1');
        assert.equal(o.type, 'String');
        assert(!o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
        assert.equal(o.defaultValue, '1');
      });

      it('should parse: String!', function() {
        const o = parseInputTypeString('String!');
        assert.equal(o.type, 'String');
        assert(o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: [String!]!', function() {
        const o = parseInputTypeString('[String!]!');
        assert.equal(o.type, 'String');
        assert(o.nonNull);
        assert(o.list);
        assert(o.nonNullItems);
      });

      it('should check empty arg', function() {
        try {
          parseInputTypeString();
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });

      it('should check valid arg', function() {
        try {
          parseInputTypeString('[dfds');
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });
    });

    describe('makeArray()', function() {
      it('test all', function() {
        let a = makeArray(null, 1, 2, [3, 4]);
        assert.deepEqual(a, [1, 2, 3, 4]);
        a = makeArray([1], 2, [3, 4]);
        assert.deepEqual(a, [1, 2, 3, 4]);
      });
    });

    describe('mergeCalls()', function() {

      it('should return null if argument is empty', function() {
        let v = mergeCalls();
        assert.equal(v, undefined);
        v = mergeCalls([]);
        assert.equal(v, undefined);
      });

      it('should call next till return a value', async function() {
        let i = 0;
        let fn = mergeCalls([
          () => {
            i++;
          },
          () => {
            i++;
            return 'OK';
          }]);
        const v = await fn();
        assert.equal(v, 'OK');
        assert.equal(i, 2);
      });

      it('should skip non function items', async function() {
        let fn = mergeCalls([
          123,
          () => {
            return 'OK';
          }]);
        const v = await fn();
        assert.equal(v, 'OK');
      });

      it('should handle errors', async function() {
        let fn = mergeCalls([
          () => {
            throw new Error('Any error');
          }]);
        try {
          const v = await fn();
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });

      it('should handle promises', async function() {
        let fn = mergeCalls([
          () => {
            return new Promise(resolve => resolve('OK'));
          }]);
        const v = await fn();
        assert.equal(v, 'OK');
      });

      it('should handle promise errors', async function() {
        let fn = mergeCalls([
          () => {
            return new Promise((resolve, reject) => reject('OK'));
          }]);
        try {
          const v = await fn();
        } catch (e) {
          return;
        }
        assert(0, 'Failed');
      });

    });

  });

  describe('XMap', function() {

    it('should construct', function() {
      const m = new XMap();
      m.set('a', 1);
      assert.equal(m.get('a'), 1);
    });

    it('should call converter function when set any item', function() {
      const m = new XMap((n, v) => {
        return v + 1;
      });
      m.set('a', 1);
      assert.equal(m.get('a'), 2);
    });

    it('should remove item when call set(name, undefined)', function() {
      const m = new XMap((n, v) => {
        return v !== undefined ? v + 1 : undefined;
      });
      m.set('a', 1);
      m.set('a', undefined);
      assert(!m.has('a'), 'Failed');
    });

    it('should call setAll() for batch operation', function() {
      const m = new XMap((n, v) => {
        return v !== undefined ? v + 1 : undefined;
      });
      m.setAll({a: 1, b: 2});
      assert.equal(m.get('a'), 2);
      assert.equal(m.get('b'), 3);
    });

    it('should call setAll() with object argument only', function() {
      const m = new XMap();
      try {
        m.setAll([]);
      } catch (e) {
        try {
          m.setAll('dfad');
        } catch (e) {
          return;
        }
      }
      assert(0, 'Failed');
    });

  });

});