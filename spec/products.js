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

    it('returns the created product resource', () => {
      const expectedResource = Object.assign({id: postResponse.result.id, _metadata: postResponse.result._metadata}, productParameters);
      expect(postResponse.result).to.deep.equal(expectedResource);
    });
  });
});
