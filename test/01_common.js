/* eslint-disable */
const assert = require('assert');
const {rejects, doesNotReject} = require('rejected-or-not');
const {
  parseInputTypeString,
  parseTypeString,
  makeArray,
  mergeCalls
} = require('../lib/helpers');
const XMap = require('../lib/XMap');

assert.rejects = assert.rejects || rejects;
assert.doesNotReject = assert.doesNotReject || doesNotReject;

describe('common', function() {

  describe('helpers', function() {

    describe('parseTypeString()', function() {

      it('should parse: String', function() {
        const o = parseTypeString('String');
        assert.strictEqual(o.type, 'String');
        assert(!o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: String!', function() {
        const o = parseTypeString('String!');
        assert.strictEqual(o.type, 'String');
        assert(o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: [String!]!', function() {
        const o = parseTypeString('[String!]!');
        assert.strictEqual(o.type, 'String');
        assert(o.nonNull);
        assert(o.list);
        assert(o.nonNullItems);
      });

      it('should check empty arg', function() {
        assert.throws(() => {
          parseTypeString();
        }, /is not a valid type definition/);
      });

      it('should check valid arg', function() {
        assert.throws(() => {
          parseTypeString('[dfds');
        }, /is not a valid type definition/);
      });
    });

    describe('parseInputTypeString()', function() {

      it('should parse: String', function() {
        const o = parseInputTypeString('String = 1');
        assert.strictEqual(o.type, 'String');
        assert(!o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
        assert.strictEqual(o.defaultValue, 1);
      });

      it('should parse: String!', function() {
        const o = parseInputTypeString('String!');
        assert.strictEqual(o.type, 'String');
        assert(o.nonNull);
        assert(!o.list);
        assert(!o.nonNullItems);
      });

      it('should parse: [String!]!', function() {
        const o = parseInputTypeString('[String!]!');
        assert.strictEqual(o.type, 'String');
        assert(o.nonNull);
        assert(o.list);
        assert(o.nonNullItems);
      });

      it('should check empty arg', function() {
        assert.throws(() => {
          parseInputTypeString();
        }, /is not a valid type definition/);
      });

      it('should check valid arg', function() {
        assert.throws(() => {
          parseInputTypeString('[dfds');
        }, /is not a valid type definition/);
      });
    });

    describe('makeArray()', function() {
      it('test all', function() {
        let a = makeArray(null, 1, 2, [3, 4]);
        assert.deepStrictEqual(a, [1, 2, 3, 4]);
        a = makeArray([1], 2, [3, 4]);
        assert.deepStrictEqual(a, [1, 2, 3, 4]);
      });
    });

    describe('mergeCalls()', function() {

      it('should return null if argument is empty', function() {
        let v = mergeCalls();
        assert.strictEqual(v, undefined);
        v = mergeCalls([]);
        assert.strictEqual(v, undefined);
      });

      it('should call next till return a value', function() {
        let i = 0;
        let fn = mergeCalls([
          () => {
            i++;
          },
          () => {
            i++;
            return 'OK';
          }]);
        return fn().then(v => {
          assert.strictEqual(v, 'OK');
          assert.strictEqual(i, 2);
        });
      });

      it('should skip non function items', function() {
        let fn = mergeCalls([
          123,
          () => {
            return 'OK';
          }]);
        return fn().then(v => {
          assert.strictEqual(v, 'OK');
        });
      });

      it('should handle errors', function() {
        let fn = mergeCalls([
          () => {
            throw new Error('Any error');
          }]);
        return assert.rejects(() => fn());
      });

      it('should handle promises', function() {
        let fn = mergeCalls([
          () => {
            return new Promise(resolve => resolve('OK'));
          }]);
        return fn().then(v => {
          assert.strictEqual(v, 'OK');
        });
      });

      it('should handle promise errors', function() {
        let fn = mergeCalls([
          () => {
            return new Promise((resolve, reject) => reject('OK'));
          }]);
        return assert.rejects(() => fn());
      });

    });

  });

  describe('XMap', function() {

    it('should construct', function() {
      const m = new XMap();
      m.set('a', 1);
      assert.strictEqual(m.get('a'), 1);
    });

    it('should call converter function when set any item', function() {
      const m = new XMap((n, v) => (v + 1));
      m.set('a', 1);
      assert.strictEqual(m.get('a'), 2);
    });

    it('should remove item when call set(name, undefined)', function() {
      const m = new XMap((n, v) => (v !== undefined ? v + 1 : undefined));
      m.set('a', 1);
      m.set('a', undefined);
      assert(!m.has('a'), 'Failed');
    });

    it('should call setAll() for batch operation', function() {
      const m = new XMap((n, v) => (v !== undefined ? v + 1 : undefined));
      m.setAll({a: 1, b: 2});
      assert.strictEqual(m.get('a'), 2);
      assert.strictEqual(m.get('b'), 3);
    });

    it('should call setAll() with object argument only', function() {
      const m = new XMap();
      assert.throws(()=>{
        m.setAll([]);
      },/You must provide Object instance/);
      assert.throws(()=>{
        m.setAll('dfad');
      },/You must provide Object instance/);

    });

  });

});
