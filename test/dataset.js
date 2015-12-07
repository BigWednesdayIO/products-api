'use strict';

const expect = require('chai').expect;
const dataset = require('../lib/dataset');

describe('Dataset', () => {
  describe('product key', () => {
    let key;

    before(() => {
      key = dataset.productKey('myid123');
    });

    it('creates a key containing the product kind', () => {
      expect(key.path.indexOf('Product')).to.equal(0, 'Expected first part of key to be Product');
    });

    it('creates a key containing the product id', () => {
      expect(key.path.indexOf('myid123')).to.equal(1, 'Expected second part of key to be the product id');
    });

    it('errors when product id is not provided', () => {
      expect(() => dataset.productKey()).to.throw(Error, /Missing product identifier/);
    });
  });
});
