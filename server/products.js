'use strict';

const Joi = require('joi');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/products',
    handler: (request, reply) => {
      const id = 1;
      reply({id}).created(`/products/${id}`);
    },
    config: {
      tags: ['api'],
      response: {
        status: {
          201: Joi.object().meta({className: 'Product'}).description('The created product')
        }
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'products'
};
