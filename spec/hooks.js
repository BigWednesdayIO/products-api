'use strict';

const _ = require('lodash');
const dataset = require('../lib/dataset');

afterEach(() => {
  const query = dataset.createQuery('Product');

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        console.error(err);
        console.log(`Error deleting Product data`);

        reject(err);
      }

      const keys = _.map(res, 'key');
      dataset.delete(keys, err => {
        if (err) {
          console.error(err);
          console.log(`Error deleting Product data`);

          reject(err);
        }

        resolve();
      });
    });
  });
});
