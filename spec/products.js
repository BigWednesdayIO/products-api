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
});
