/* GSB
 ------------------------
 (c) 2017-present Panates
 SQB may be freely distributed under the MIT license.
 For details and documentation:
 https://panates.github.io/gsb/
*/

/**
 * @class
 * @abstract
 */
class SchemaItem {

  /**
   *
   * @param {Object} owner
   * @param {String} name
   * @param {Object} cfg
   * @constructor
   */
  constructor(owner, name, cfg) {
    this._owner = owner;
    this.name = name;
    if (typeof cfg === 'object' && cfg.description !== undefined) {
      this.description = cfg.description;
    }
  }

  /**
   *
   * @return {String}
   */
  get name() {
    return this._name;
  }

  /**
   *
   * @param {String} value
   */
  set name(value) {
    this._name = value;
  }

  /**
   *
   * @return {String}
   */
  get description() {
    return this._description;
  }

  /**
   *
   * @param {String} value
   */
  set description(value) {
    this._description = value ? String(value) : null;
  }

}

module.exports = SchemaItem;
