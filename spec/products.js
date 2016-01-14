'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const jsonwebtoken = require('jsonwebtoken');
const specRequest = require('./spec_request');
const productParameters = require('./parameters/product');

const authToken = options =>
  jsonwebtoken.sign(
    {},
    new Buffer(process.env.JWT_SECRET, 'base64'),
    Object.assign({algorithm: 'HS256'}, options));

describe('/products', () => {
  describe('post', () => {
    let postResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: productParameters}).then(response => postResponse = response));

    it('returns http 201', () => {
      expect(postResponse.statusCode).to.equal(201);
    });

    it('returns a generated id', () => {
      expect(postResponse.result).has.property('id');
      expect(postResponse.result.id).to.match(/^c.{24}$/);
    });

    it('returns created and updated dates', () => {
      expect(postResponse.result).to.have.property('_metadata');
      expect(postResponse.result._metadata.created).to.be.a('date');
      expect(postResponse.result._metadata.updated).to.be.a('date');
    });

    it('returns the created product', () => {
      expect(_.omit(postResponse.result, 'id', '_metadata')).to.deep.equal(productParameters);
    });

    it('returns the location of the created product', () => {
      expect(postResponse.headers).to.have.property('location', `/products/${postResponse.result.id}`);
    });
  });

  describe('get', () => {
    let getResponse;
    let createResponses;

    beforeEach(() =>
      Promise.all([
        specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: _.assign({}, productParameters, {name: 'one'})}),
        specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: _.assign({}, productParameters, {name: 'two'})}),
        specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: _.assign({}, productParameters, {name: 'three'})}),
        specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: _.assign({}, productParameters, {name: 'four'})})
      ])
      .then(responses => createResponses = responses)
      .then(() => specRequest({url: `/products?id[]=${createResponses.slice(0, 3).map(r => r.result.id).join('&id[]=')}`, method: 'GET', headers: {authorization: authToken()}}))
      .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the products', () => {
      expect(getResponse.result).to.be.an('array');
      expect(getResponse.result).to.have.length(3);
      expect(getResponse.result).to.deep.equal(createResponses.slice(0, 3).map(r => r.result));
    });

    it('returns an empty array when none of the requested products are found', () =>
      specRequest({url: '/products?id[]=1&id[]=2&id[]=3', method: 'GET', headers: {authorization: authToken()}})
        .then(response => expect(response.result).to.have.length(0)));

    it('returns the expanded category resources', () =>
      specRequest({
        url: `/products?expand[]=category&id[]=${createResponses.slice(0, 3).map(r => r.result.id).join('&id[]=')}`,
        method: 'GET',
        headers: {authorization: authToken()}
      }).then(response => {
        response.result.forEach(product => {
          expect(product).to.not.have.property('category_id');
          expect(product.category).to.deep.equal({
            id: '6572',
            name: 'Avocados',
            _metadata: {
              hierarchy: ['412', '412.5793', '412.5793.6572']
            }});
        });
      }));

    // we may want to introduce a general GET all method, but for now not required so make ids filter required
    it('rejects with http 400 when id filter is not provided', () =>
      specRequest({url: '/products', method: 'GET', headers: {authorization: authToken()}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "id" fails because ["id" is required]');
        }));

    it('rejects with http 400 when id filter is not an array', () =>
      specRequest({url: '/products?id=1', method: 'GET', headers: {authorization: authToken()}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "id" fails because ["id" must be an array]');
        }));

    it('rejects with http 400 when id array contains a non-string value', () =>
      specRequest({url: '/products?id[]=123&id[]=', method: 'GET', headers: {authorization: authToken()}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "id" fails because ["id" at position 1 fails because ["1" is not allowed to be empty]]');
        }));

    it('rejects with http 400 when more than 50 ids are requested', () =>
      specRequest({url: `/products?id[]=${Array.from(Array(51).keys()).join('&id[]=')}`, headers: {authorization: authToken()}})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "id" fails because ["id" must contain less than or equal to 50 items]');
        }));
  });
});

describe('/products/{id}', () => {
  describe('get', () => {
    let createResponse;
    let getResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: productParameters})
        .then(response => {
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'GET', headers: {authorization: authToken()}});
        })
        .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the id', () => {
      expect(getResponse.result).to.have.property('id', createResponse.result.id);
    });

    it('returns created and updated dates', () => {
      expect(getResponse.result).to.have.property('_metadata');
      expect(getResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
      expect(getResponse.result._metadata.updated).to.deep.equal(createResponse.result._metadata.updated);
    });

    it('returns the product', () => {
      expect(_.omit(getResponse.result, 'id', '_metadata')).to.deep.equal(productParameters);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'GET', headers: {authorization: authToken()}}).then(response => expect(response.statusCode).to.equal(404)));

    it('expands category resource', () =>
      specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: productParameters})
        .then(response => specRequest({url: `${response.headers.location}?expand[]=category`, headers: {authorization: authToken()}, method: 'GET'}))
        .then(response => {
          expect(response.result).to.have.property('category');
          expect(response.result).to.not.have.property('category_id');

          expect(response.result.category).to.deep.equal({
            id: '6572',
            name: 'Avocados',
            _metadata: {
              hierarchy: ['412', '412.5793', '412.5793.6572']
            }});
        }));
  });

  describe('put', () => {
    let createResponse;
    let putResponse;
    let getResponse;
    const updatedProductParameters = Object.assign({}, productParameters, {name: 'new name'});

    before(() =>
      specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: productParameters})
        .then(response => {
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'PUT', headers: {authorization: authToken()}, payload: updatedProductParameters});
        })
        .then(response => {
          putResponse = response;
          return specRequest({url: `/products/${response.result.id}`, headers: {authorization: authToken()}, method: 'GET'}).then(response => getResponse = response);
        })
    );

    it('returns http 200', () => {
      expect(putResponse.statusCode).to.equal(200);
    });

    it('returns the id', () => {
      expect(putResponse.result).to.have.property('id', createResponse.result.id);
    });

    it('returns created and updated dates', () => {
      expect(putResponse.result).to.have.property('_metadata');
      expect(putResponse.result._metadata.created).to.deep.equal(createResponse.result._metadata.created);
      expect(putResponse.result._metadata.updated.toISOString()).to.be.above(createResponse.result._metadata.updated.toISOString());
    });

    it('returns the updated product', () => {
      expect(_.omit(putResponse.result, 'id', '_metadata')).to.deep.equal(updatedProductParameters);
    });

    it('persists the update', () => {
      expect(getResponse.result).to.deep.equal(putResponse.result);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'PUT', headers: {authorization: authToken()}, payload: updatedProductParameters})
        .then(response => expect(response.statusCode).to.equal(404))
    );
  });

  describe('delete', () => {
    let deleteResponse;
    let getResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', headers: {authorization: authToken()}, payload: productParameters})
        .then(postResponse => specRequest({url: postResponse.headers.location, method: 'DELETE', headers: {authorization: authToken()}}))
        .then(response => {
          deleteResponse = response;
          return specRequest({url: response.request.url, method: 'GET', headers: {authorization: authToken()}}).then(response => getResponse = response);
        })
    );

    it('returns http 204', () => {
      expect(deleteResponse.statusCode).to.equal(204);
    });

    it('removes the product', () => {
      expect(getResponse.statusCode).to.equal(404);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'DELETE', headers: {authorization: authToken()}})
        .then(response => expect(response.statusCode).to.equal(404))
    );
  });
});

describe('payload validation', () => {
  const attributes = [
    {name: 'name', type: 'string', required: true},
    {name: 'product_type', type: 'string', required: true},
    {name: 'brand', type: 'string'},
    {name: 'category_id', type: 'string', required: true},
    {name: 'short_description', type: 'string'},
    {name: 'description', type: 'string'},
    {name: 'pack_size', type: 'string'},
    {name: 'unit_size', type: 'string'},
    {name: 'taxable', type: 'boolean', required: true},
    {name: 'product_type_attributes', type: 'array', required: true}
  ];

  [{method: 'POST', url: '/products'}, {method: 'PUT', url: '/products/1'}].forEach(request => {
    attributes.filter(a => a.required).forEach(attribute => {
      it(`requires ${attribute.name} for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: _.omit(productParameters, attribute.name)})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" is required]`);
          })
      );
    });

    attributes.filter(a => a.type === 'string').forEach(attribute => {
      it(`rejects non-string ${attribute.name} values for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {[attribute.name]: 1})})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must be a string]`);
          })
      );
    });

    it(`rejects unknown product_type values for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {product_type: '123'})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.match(/^child "product_type" fails because \["product_type" must be one of \[.*\]\]$/);
        })
    );

    it(`validates that product_type_attributes have names for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {product_type_attributes: [{values: []}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "name" fails because ["name" is required]]]');
        })
    );

    it(`validates that product_type_attributes name is a string for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 1, values: []}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "name" fails because ["name" must be a string]]]');
        })
    );

    it(`validates that product_type_attributes have values for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 'test_attribute'}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "values" fails because ["values" is required]]]');
        })
    );

    it(`validates that product_type_attributes values is an array for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, headers: {authorization: authToken()}, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 'test_attribute', values: 1}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "values" fails because ["values" must be an array]]]');
        })
    );

    it(`validates that product_type_attributes contains required attributes for ${request.method} request product_type`, () =>
      specRequest({
        url: request.url,
        method: request.method,
        headers: {authorization: authToken()},
        payload: Object.assign({}, productParameters, {product_type_attributes: []}
      )}).then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" are not valid for product_type "test_product"]');
        expect(response.result.product_type_validation_error).to.equal(true);
        expect(response.result.required_product_type_attributes).to.deep.equal(['test_attribute']);
      })
    );

    it(`validates that product_type_attributes does not contain unknown attribute names for ${request.method} request product_type`, () =>
      specRequest({
        url: request.url,
        method: request.method,
        headers: {authorization: authToken()},
        payload: Object.assign({},
          productParameters,
          {product_type_attributes: [{name: 'test_attribute', values: []}, {name: 'extra_attribute1', values: []}, {name: 'extra_attribute2', values: []}]}
      )}).then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" are not valid for product_type "test_product"]');
        expect(response.result.product_type_validation_error).to.equal(true);
        expect(response.result.forbidden_product_type_attributes).to.deep.equal(['extra_attribute1', 'extra_attribute2']);
      })
    );

    it(`validates that product_type_attributes does not contain invalid value types for ${request.method} request product_type`, () =>
      specRequest({
        url: request.url,
        method: request.method,
        headers: {authorization: authToken()},
        payload: Object.assign({},
          productParameters,
          {product_type_attributes: [{name: 'test_attribute', values: ['1', 2]}]}
      )}).then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" are not valid for product_type "test_product"]');
        expect(response.result.product_type_validation_error).to.equal(true);
        expect(response.result.invalid_product_type_attributes).to.deep.equal(['"test_attribute" values fails because ["value" at position 1 fails because ["1" must be a string]]']);
      })
    );
  });

  describe('authorization', () => {
    require('../server')((err, server) => {
      if (err) {
        throw new Error(err);
      }

      server.table()[0].table
        .filter(route => route.path.indexOf('/products') === 0)
        .forEach(route => {
          it(`requires auth token for ${route.method} ${route.path}`, () =>
            specRequest({url: route.path, method: route.method})
              .then(response => expect(response.statusCode).to.equal(401)));

          it(`requires an unexpired auth token for ${route.method} ${route.path}`, () =>
            specRequest({url: route.path, method: route.method, headers: {authorization: authToken({expiresIn: '0'})}})
              .then(response => {
                expect(response.statusCode).to.equal(401);
                expect(response.result).to.have.property('message', 'Token expired');
              }));

          it(`requires auth token with HS256 algorithm for ${route.method} ${route.path}`, () =>
            specRequest({url: route.path, method: route.method, headers: {authorization: authToken({algorithm: 'HS512'})}})
              .then(response => {
                expect(response.statusCode).to.equal(401);
                expect(response.result).to.have.property('message', 'Invalid token');
              }));
        });
    });
  });
});
