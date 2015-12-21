'use strict';

const request = require('request');

const productMapper = require('./product_mapper');

const indexingApi = `http://${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_HOST}:${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_PORT}`;

module.exports = datasetModel => {
  datasetModel.on('updated', product => {
    request.post({
      url: `${indexingApi}/indexing_jobs`,
      json: {
        trigger_type: 'product',
        action: 'update',
        data: productMapper.toModel(product, ['category'])
      }
    }, (err, response, body) => {
      if (err) {
        return console.error(`Failed to make indexing request for product - ${err.message}`);
      }

      if (response.statusCode !== 202) {
        return console.error(`Unexpected HTTP response ${response.statusCode} for product indexing request - ${JSON.stringify(body)}`);
      }
    });
  });
};
