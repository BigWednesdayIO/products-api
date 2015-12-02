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
          reply.badImplementation();
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

  server.route({
    method: 'GET',
    path: '/products/{id}',
    handler: (request, reply) => {
      products.get(request.params.id)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('The product identifier')
        }
      },
      response: {
        status: {
          200: Joi.object().meta({className: 'Product'}).description('A product')
        }
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/products/{id}',
    handler: (request, reply) => {
      products.update(request.params.id, request.payload)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: Joi.string().required().description('The product identifier')
        }
      },
      response: {
        status: {
          200: Joi.object().meta({className: 'Product'}).description('The updated product')
        }
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'products'
};
