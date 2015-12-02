'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const productParameters = require('./parameters/product');

describe('/products', () => {
  describe('post', () => {
    let postResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', payload: productParameters}).then(response => postResponse = response));

    it('returns http 201', () => {
      expect(postResponse.statusCode).to.equal(201);
    });

    it('returns the location of the created product', () => {
      expect(postResponse.headers).to.have.property('location', `/products/${postResponse.result.id}`);
    });

    it('returns the created product', () => {
      const expectedProduct = Object.assign({id: postResponse.result.id, _metadata: postResponse.result._metadata}, productParameters);
      expect(postResponse.result).to.deep.equal(expectedProduct);
    });
  });
});

describe('/products/{id}', () => {
  describe('get', () => {
    let getResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', payload: productParameters})
        .then(postResponse => specRequest({url: postResponse.headers.location, method: 'GET'}))
        .then(response => getResponse = response));

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the product', () => {
      const expectedProduct = Object.assign({id: getResponse.result.id, _metadata: getResponse.result._metadata}, productParameters);
      expect(getResponse.result).to.deep.equal(expectedProduct);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'GET'}).then(response => expect(response.statusCode).to.equal(404))
    );
  });

  describe('put', () => {
    let putResponse;
    let getResponse;
    let expectedProduct;
    const updatedProductParameters = Object.assign({}, productParameters, {name: 'new name'});

    before(() =>
      specRequest({url: '/products', method: 'POST', payload: productParameters})
        .then(postResponse => specRequest({url: postResponse.headers.location, method: 'PUT', payload: updatedProductParameters}))
        .then(response => {
          putResponse = response;
          expectedProduct = Object.assign({id: response.result.id, _metadata: response.result._metadata}, updatedProductParameters);

          return specRequest({url: `/products/${expectedProduct.id}`, method: 'GET'}).then(response => getResponse = response);
        })
    );

    it('returns http 200', () => {
      expect(putResponse.statusCode).to.equal(200);
    });

    it('returns the updated product', () => {
      expect(putResponse.result).to.deep.equal(expectedProduct);
    });

    it('persists the update', () => {
      expect(getResponse.result).to.deep.equal(expectedProduct);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'PUT', payload: updatedProductParameters})
        .then(response => expect(response.statusCode).to.equal(404))
    );
  });

  describe('delete', () => {
    let deleteResponse;
    let getResponse;

    before(() =>
      specRequest({url: '/products', method: 'POST', payload: productParameters})
        .then(postResponse => specRequest({url: postResponse.headers.location, method: 'DELETE'}))
        .then(response => {
          deleteResponse = response;
          return specRequest({url: response.request.url, method: 'GET'}).then(response => getResponse = response);
        })
    );

    it('returns http 204', () => {
      expect(deleteResponse.statusCode).to.equal(204);
    });

    it('removes the product', () => {
      expect(getResponse.statusCode).to.equal(404);
    });

    it('returns http 404 for a product that doesn\'t exist', () =>
      specRequest({url: '/products/notexists', method: 'DELETE'})
        .then(response => expect(response.statusCode).to.equal(404))
    );
  });
});

describe('payload validation', () => {
  const attributes = [
    {name: 'name', type: 'string', required: true},
    {name: 'product_type', type: 'string', required: true},
    {name: 'brand', type: 'string', required: true},
    {name: 'category', type: 'string', required: true},
    {name: 'short_description', type: 'string'},
    {name: 'description', type: 'string'},
    {name: 'product_type_attributes', type: 'array', required: true}
  ];

  [{method: 'POST', url: '/products'}, {method: 'PUT', url: '/products/1'}].forEach(request => {
    attributes.filter(a => a.required).forEach(attribute => {
      it(`requires ${attribute.name} for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, payload: _.omit(productParameters, attribute.name)})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" is required]`);
          })
      );
    });

    attributes.filter(a => a.type === 'string').forEach(attribute => {
      it(`rejects non-string ${attribute.name} values for ${request.method} request`, () =>
        specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {[attribute.name]: 1})})
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result.message).to.equal(`child "${attribute.name}" fails because ["${attribute.name}" must be a string]`);
          })
      );
    });

    it(`rejects unknown product_type values for ${request.method} request`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {product_type: '123'})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.match(/^child "product_type" fails because \["product_type" must be one of \[.*\]\]$/);
        })
    );

    it(`validates that product_type_attributes have names for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {product_type_attributes: [{values: []}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "name" fails because ["name" is required]]]');
        })
    );

    it(`validates that product_type_attributes name is a string for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 1, values: []}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "name" fails because ["name" must be a string]]]');
        })
    );

    it(`validates that product_type_attributes have values for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 'test_attribute'}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "values" fails because ["values" is required]]]');
        })
    );

    it(`validates that product_type_attributes values is an array for ${request.method}`, () =>
      specRequest({url: request.url, method: request.method, payload: Object.assign({}, productParameters, {product_type_attributes: [{name: 'test_attribute', values: 1}]})})
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "product_type_attributes" fails because ["product_type_attributes" at position 0 fails because [child "values" fails because ["values" must be an array]]]');
        })
    );

    it(`validates that product_type_attributes contains required attributes for ${request.method} request product_type`, () =>
      specRequest({
        url: request.url,
        method: request.method,
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
});
