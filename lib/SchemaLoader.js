/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

const Schema = require('./Schema');
const waterfall = require('putil-waterfall');
const promisify = require('putil-promisify');
const {makeArray} = require('./helpers');
const path = require('path');
const caller = require('caller');

class SchemaLoader {

  /**
   * @param {Function|String} loadFn
   */
  constructor(loadFn) {
    this._dirname = path.dirname(caller());
    if (typeof loadFn === 'string')
      this._dirname = path.resolve(this._dirname, loadFn);
    else this._loadFn = loadFn;
  }

  load(def, callback) {
    if (!callback)
      return promisify.fromCallback(cb => this.load(def, cb));

    this._loadCache = {};
    const loadFn = this._loadFn ? this._loadFn :
        (v, cb) => cb(null, v);
    this._load(def, loadFn, (...args) => {
      delete this._loadCache;
      callback(...args);
    });
  }

  _load(def, loadFn, callback) {

    const doLoad = (v) => {
      const obj = typeof v === 'string' ?
          require(path.resolve(this._dirname, v)) : v;
      if (!obj) {
        callback(null);
        return;
      }
      if (typeof obj !== 'object') {
        callback(new Error('Unable to load schema.' + String(v) + ' returns ' +
            (typeof obj) + ' except an Object instance'));
        return;
      }
      const self = this;
      const schema = new Schema();
      waterfall.every(makeArray(obj.link),
          (next, namespace) => {
            if (this._loadCache[namespace]) {
              next(this._loadCache[namespace]);
              return;
            }
            self._load(namespace, loadFn, (err, sch) => {
              if (err) {
                next(err);
                return;
              }
              sch.namespace = namespace;
              schema.link(namespace, sch);
              next();
            });
          },
          (err) => {
            if (err) {
              callback(err);
              return;
            }
            if (typeof def === 'string')
              schema.namespace = def;
            schema.load(obj);
            callback(null, schema);
          });
    };

    try {
      let v;
      if (loadFn.length <= 1) {
        v = loadFn(def);
        if (v) doLoad(v);
      } else {
        loadFn(def, (err, o) => {
          if (err) {
            callback(err);
            return;
          }
          doLoad(o);
        });
      }
    } catch (e) {
      callback(e);
    }

  }

}

module.exports = SchemaLoader;
