'use strict';

const hapi = require('hapi');
const errorSchemas = require('hapi-error-schemas');

const basePlugins = [{
  register: require('./jwt_auth_strategy')
}, {
  register: require('hapi-version-route'),
  options: {auth: false}
}, {
  register: require('hapi-boom-decorators')
}, {
  register: require('hapi-swaggered'),
  options: {
    auth: false,
    info: {
      title: 'Products API',
      version: process.env.npm_package_version
    }
  }
}];

const applicationPlugins = [require('./products')];

module.exports = callback => {
  const server = new hapi.Server({
    connections: {
      routes: {
        auth: false,
        response: {
          failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
          status: errorSchemas.statuses()
        }
      }
    }
  });

  server.connection({port: 8080});

  server.register(basePlugins, err => {
    if (err) {
      return callback(err);
    }

    server.register(applicationPlugins, err => {
      if (err) {
        return callback(err);
      }

      callback(null, server);
    });
  });
};
