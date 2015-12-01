'use strict';

const Joi = require('joi');

const products = require('../lib/product_store');

module.exports.register = (server, options, next) => {
  server.route({
    method: 'POST',
    path: '/products',
    handler: (request, reply) => {
      products.create(request.payload)
        .then(product => reply(product).created(`/products/${product.id}`))
        .catch(err => {
          console.log(err);
          reply.badImplementation(err);
        });
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
