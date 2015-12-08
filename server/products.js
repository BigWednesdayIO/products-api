'use strict';

const cuid = require('cuid');
const Joi = require('joi');

const dataset = require('../lib/dataset');
const datasetEntities = require('../lib/dataset_entities');
const DatastoreModel = require('gcloud-datastore-model')(dataset);

const productTypes = [
  {
    name: 'test_product',
    attributes: [
      {name: 'test_attribute', required: true, valuesSchema: Joi.array().items(Joi.string()).required()}
    ]
  }
];

const baseAttributes = {
  name: Joi.string().required().description('Product name'),
  brand: Joi.string().required().description('Brand'),
  category: Joi.string().required().description('Category'),
  description: Joi.string().description('Description'),
  short_description: Joi.string().description('Short description'),
  product_type: Joi.string().valid(productTypes.map(t => t.name)).required().description('Product type'),
  product_type_attributes: Joi.array().items(Joi.object({
    name: Joi.string().required().description('Attribute name'),
    values: Joi.array().required().description('Attribute values')
  }).meta({className: 'ProductTypeAttribute'})).required().description('Additional attributes associated with the product type')
};

const requestSchema = Joi.object(baseAttributes).meta({className: 'ProductParameters'});

const responseSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('Product identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the product was created'),
    updated: Joi.date().required().description('Date the product was updated')
  }).meta({className: 'ProductMetaData'})
}, baseAttributes)).meta({className: 'Product'});

const validateProductType = (request, reply) => {
  const productType = productTypes.find(type => type.name === request.payload.product_type);

  const additionalAttributes = [];
  const validationErrors = [];
  const missingAttributes = productType.attributes
    .filter(attribute => attribute.required && !request.payload.product_type_attributes.find(a => a.name === attribute.name))
    .map(attribute => attribute.name);

  request.payload.product_type_attributes.forEach(attribute => {
    const productTypeAttribute = productType.attributes.find(a => a.name === attribute.name);

    if (productTypeAttribute) {
      const validationResult = Joi.validate(attribute.values, productTypeAttribute.valuesSchema);

      if (validationResult.error) {
        validationErrors.push(`"${attribute.name}" values fails because [${validationResult.error.message}]`);
      }
    } else {
      additionalAttributes.push(attribute.name);
    }
  });

  if (additionalAttributes.length || validationErrors.length || missingAttributes.length) {
    return reply.badRequest(
      'child "product_type_attributes" fails because ["product_type_attributes" are not valid for product_type "test_product"]',
      {
        product_type_validation_error: true,
        forbidden_product_type_attributes: additionalAttributes,
        invalid_product_type_attributes: validationErrors,
        required_product_type_attributes: missingAttributes
      });
  }

  reply();
};

const formatProductTypeValidationError = (request, reply) => {
  if (!(request.response.data && request.response.data.product_type_validation_error)) {
    return reply.continue();
  }

  const response = Object.assign({},
    request.response.data,
    request.response.output.payload);

  reply(response).code(400);
};

module.exports.register = (server, options, next) => {
  server.ext('onPreResponse', formatProductTypeValidationError);

  server.route({
    method: 'POST',
    path: '/products',
    handler: (request, reply) => {
      DatastoreModel.insert(datasetEntities.productKey(cuid()), request.payload)
        .then(product => reply(product).created(`/products/${product.id}`))
        .catch(err => {
          console.log(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: validateProductType}],
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
      DatastoreModel.get(datasetEntities.productKey(request.params.id))
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
      DatastoreModel.update(datasetEntities.productKey(request.params.id), request.payload)
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
      pre: [{method: validateProductType}],
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
      DatastoreModel.delete(datasetEntities.productKey(request.params.id))
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
