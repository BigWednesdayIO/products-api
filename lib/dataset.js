'use strict';

const gcloud = require('gcloud');
const projectId = process.env.GCLOUD_PROJECT_ID;
const credentials = process.env.GCLOUD_KEY;

const dataset = gcloud.datastore.dataset({
  projectId,
  credentials: JSON.parse(new Buffer(credentials, 'base64').toString('ascii'))
});

module.exports = dataset;

module.exports.productKey = productId => {
  if (!productId) {
    throw new Error('Missing product identifier');
  }

  return dataset.key(['Product', productId]);
};
