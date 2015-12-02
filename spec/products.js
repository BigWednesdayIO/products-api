'use strict';

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
