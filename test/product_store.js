'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const expect = require('chai').expect;
const dataset = require('../lib/dataset');
const productStore = require('../lib/product_store');

describe('Product store', () => {
  const stubbedDate = new Date();
  const existingProduct = {
    id: 'abcd1',
    name: 'an existing product',
    category: 'baked beans',
    _metadata: {created: stubbedDate}
  };

  let sandbox;
  let saveStub;
  let deleteStub;
  let keySpy;
  let clock;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers(stubbedDate.getTime());

    saveStub = sandbox.stub(dataset, 'save', (entity, callback) => callback());
    deleteStub = sandbox.stub(dataset, 'delete', (key, callback) => callback());
    keySpy = sandbox.spy(dataset, 'key');

    sandbox.stub(dataset, 'get', (key, callback) => {
      if (_.last(key.path) === existingProduct.id) {
        return callback(null, {
          key: {path: ['Product', existingProduct.id]},
          data: Object.assign({
            _metadata_created: existingProduct._metadata.created
          }, _.omit(existingProduct, ['id', '_metadata']))
        });
      }

      callback();
    });
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

  describe('get', () => {
    it('returns a product', () =>
      productStore.get(existingProduct.id)
        .then(product => expect(product).to.deep.equal(existingProduct))
    );

    it('throws EntityNotFoundError for unknown product', () =>
      productStore.get('notexists')
        .then(() => {
          throw new Error('expected EntityNotFoundError');
        })
        .catch(err => {
          expect(err).to.be.an('error');
          expect(err).to.have.property('name', 'EntityNotFoundError');
        })
    );
  });

  describe('update', () => {
    const updateProductParameters = {
      name: 'updated product',
      category: 'beer'
    };

    beforeEach(() => {
      clock.tick(10000);
      return productStore.update(existingProduct.id, updateProductParameters);
    });

    it('persists data against the a key containing id', () => {
      expect(keySpy.firstCall.returnValue.path).to.deep.equal(['Product', existingProduct.id]);
    });

    it('persists the new product attributes', () => {
      sinon.assert.calledOnce(saveStub);
      sinon.assert.calledWithMatch(saveStub,
        sinon.match({key: keySpy.firstCall.returnValue, method: 'update', data: updateProductParameters}));
    });

    it('persists with the original a created date', () => {
      sinon.assert.calledWithMatch(saveStub, sinon.match(value =>
        _.eq(value.data._metadata_created, stubbedDate), 'created date'));
    });

    it('throws EntityNotFoundError for unknown product', () =>
      productStore.update('notexists', updateProductParameters)
        .then(() => {
          throw new Error('expected EntityNotFoundError');
        })
        .catch(err => {
          expect(err).to.be.an('error');
          expect(err).to.have.property('name', 'EntityNotFoundError');
        })
    );
  });

  describe('delete', () => {
    beforeEach(() => productStore.delete(existingProduct.id));

    it('deletes data associated with a key containing id', () => {
      expect(keySpy.firstCall.returnValue.path).to.deep.equal(['Product', existingProduct.id]);
    });

    it('deletes the product', () => {
      sinon.assert.calledOnce(deleteStub);
      sinon.assert.calledWith(deleteStub, keySpy.firstCall.returnValue);
    });

    it('throws EntityNotFoundError for unknown product', () =>
      productStore.delete('notexists')
        .then(() => {
          throw new Error('expected EntityNotFoundError');
        })
        .catch(err => {
          expect(err).to.be.an('error');
          expect(err).to.have.property('name', 'EntityNotFoundError');
        })
    );
  });
});
