'use strict';

const request = require('request');

const indexingApi = `http://${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_HOST}:${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_PORT}`;

module.exports = datasetModel => {
  datasetModel.on('updated', model => {
    request.post({
      url: `${indexingApi}/indexing_jobs`,
      json: {
        trigger_type: 'product',
        action: 'update',
        data: model
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
