'use strict';

const dataset = require('./dataset');

module.exports.productKey = productId => {
  if (!productId) {
    throw new Error('Missing product identifier');
  }

  return dataset.key(['Product', productId]);
};
