'use strict';

const cuid = require('cuid');
const dataset = require('./dataset');
const entityStore = require('./entity_store');

const productKey = id => dataset.key(['Product', id]);

module.exports = {
  create(product) {
    return entityStore.create(productKey(cuid()), product);
  },

  get(id) {
    return entityStore.get(productKey(id));
  }
};
