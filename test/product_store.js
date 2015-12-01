'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const expect = require('chai').expect;
const dataset = require('../lib/dataset');
const productStore = require('../lib/product_store');

describe('Product store', () => {
  const stubbedDate = new Date();
  let sandbox;
  let saveStub;
  let keySpy;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(stubbedDate.getTime());

    saveStub = sandbox.stub(dataset, 'save', (entity, callback) => callback());
    keySpy = sandbox.spy(dataset, 'key');
  });

  afterEach(() => sandbox.restore());

  describe('create', () => {
    const createParameters = {name: 'a product', category: 'abc'};
    let createdProduct;

    beforeEach(() => productStore.create(createParameters).then(product => createdProduct = product));

    it('returns a generated id', () => {
      expect(createdProduct.id).to.match(/^c.{24}/);
    });

    it('returns the product attributes', () => {
      expect(_.pick(createdProduct, Object.keys(createParameters))).to.deep.equal(createParameters);
    });

    it('returns a created date', () => {
      expect(createdProduct._metadata.created.getTime()).to.equal(stubbedDate.getTime());
    });

    it('persists data against the a key containing id', () => {
      expect(keySpy.firstCall.returnValue.path).to.deep.equal(['Product', createdProduct.id]);
    });

    it('persists the product data', () => {
      sinon.assert.calledOnce(saveStub);
      sinon.assert.calledWithMatch(saveStub, sinon.match({key: keySpy.firstCall.returnValue, method: 'insert', data: createParameters}));
    });

    it('persists a created date', () => {
      sinon.assert.calledWithMatch(saveStub, sinon.match(value =>
        _.eq(value.data._metadata_created, stubbedDate), 'created date'));
    });
  });
});
