'use strict';

const categories = require('./categories-api/categories.json');

const _ = require('lodash');

module.exports.toModel = (product, expansions) => {
  if (!expansions || !expansions.length || expansions.indexOf('category') < 0) {
    return product;
  }

  const category = categories[product.category_id];

  if (!category) {
    return product;
  }

  const categoryLevels = category.hierachy.split('.');

  return Object.assign(
    {},
    _.omit(product, 'category_id'),
    {
      category: {
        id: product.category_id,
        name: category.name,
        _metadata: {
          hierarchy: categoryLevels.map((category, index) => categoryLevels.slice(0, index + 1).join('.'))
        }
      }
    });
};
