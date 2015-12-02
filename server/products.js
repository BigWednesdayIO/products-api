'use strict';

const Joi = require('joi');

const products = require('../lib/product_store');

const baseAttributes = {
  name: Joi.string().required().description('Product name'),
  product_type: Joi.string().required().description('Product type'),
  brand: Joi.string().required().description('Brand'),
  category: Joi.string().required().description('Category'),
  description: Joi.string().description('Description'),
  short_description: Joi.string().description('Short description')
};

const requestSchema = Joi.object(baseAttributes).meta({className: 'ProductParameters'});

const responseSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('Product identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the product was created')
  }).meta({className: 'ProductMetaData'})
}, baseAttributes)).meta({className: 'Product'});

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
      validate: {
        payload: requestSchema.description('The product to create')
      },
      response: {
        status: {
          201: responseSchema.description('The created product')
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
          200: responseSchema.description('A product')
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
        },
        payload: requestSchema.description('The product details to update')
      },
      response: {
        status: {
          200: responseSchema.description('The updated product')
        }
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/products/{id}',
    handler: (request, reply) => {
      products.delete(request.params.id)
        .then(() => reply().code(204))
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
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'products'
};
