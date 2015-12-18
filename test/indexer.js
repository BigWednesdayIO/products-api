'use strict';

const _ = require('lodash');
const events = require('events');
const nock = require('nock');
const sinon = require('sinon');

const expect = require('chai').expect;

const productModel = new events.EventEmitter();
const indexingApi = `http://${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_HOST}:${process.env.ORDERABLE_SEARCH_API_SVC_SERVICE_PORT}`;

require('../lib/indexer')(productModel);

describe('Indexer', () => {
  describe('on updated', () => {
    let indexingRequest;
    let indexingRequestBody;
    let consoleErrorSpy;
    const model = {id: 'p1', name: 'a product', brand: 'a brand', category: '123'};
    const emitEvent = () => productModel.emit('updated', model);

    beforeEach(done => {
      indexingRequest = nock(indexingApi)
        .post('/indexing_jobs')
        .reply(202, (uri, body) => indexingRequestBody = JSON.parse(body));

      consoleErrorSpy = sinon.spy(console, 'error');

      emitEvent();
      setImmediate(done);
    });

    afterEach(() => {
      nock.cleanAll();
      consoleErrorSpy.restore();
    });

    it('makes an indexing request', () => {
      expect(indexingRequest.isDone()).to.equal(true, 'Expected indexing request not made');
    });

    it('sets trigger_type to "product"', () => {
      expect(indexingRequestBody).to.have.property('trigger_type', 'product');
    });

    it('sets action to "update"', () => {
      expect(indexingRequestBody).to.have.property('action', 'update');
    });

    it('sets indexing data', () => {
      expect(indexingRequestBody).to.have.property('data');
    });

    it('includes model attributes in data', () => {
      _.forOwn(model, (value, key) => {
        expect(indexingRequestBody.data).to.have.property(key, value);
      });
    });

    it('logs errors making indexing request to console.error', done => {
      nock(indexingApi)
        .post('/indexing_jobs')
        .replyWithError('A non-HTTP error');

      emitEvent();

      setTimeout(() => {
        sinon.assert.calledOnce(consoleErrorSpy);
        expect(consoleErrorSpy.lastCall.args[0]).to.equal('Failed to make indexing request for product - A non-HTTP error');
        done();
      }, 500);
    });

    it('logs non-202 responses to console.error', done => {
      nock(indexingApi)
        .post('/indexing_jobs')
        .reply(500, {message: 'Internal Server Error'});

      emitEvent();

      setTimeout(() => {
        sinon.assert.calledOnce(consoleErrorSpy);
        expect(consoleErrorSpy.lastCall.args[0]).to.equal('Unexpected HTTP response 500 for product indexing request - {"message":"Internal Server Error"}');
        done();
      }, 500);
    });
  });
});
