'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const stubCategories = {
  c1: {
    name: 'category',
    hierachy: '1.2.3.c1'
  },
  c2: {
    name: 'category2',
    hierachy: '1.2.3.c1.c2'
  }
};

const mapper = proxyquire('../lib/product_mapper', {'./categories-api/categories.json': stubCategories});

const product = {id: '1', category_id: 'c1'};
const product2 = {id: '2', category_id: 'c2'};
const productWithUnknownCategory = {id: '1', category_id: 'unknown'};

describe('Product mapper', () => {
  it('returns the product', () =>
    expect(mapper.toModel(product)).to.deep.equal(product));

  it('includes the associated category when expanded', () =>
    expect(mapper.toModel(product, ['category'])).to.have.property('category'));

  it('expands to include category id', () =>
    expect(mapper.toModel(product, ['category']).category).to.have.property('id', 'c1'));

  it('expands to include category name', () =>
    expect(mapper.toModel(product, ['category']).category).to.have.property('name', 'category'));

  it('expands to include category hierarchy metadata', () =>
    expect(mapper.toModel(product, ['category']).category._metadata).to.deep.equal({hierarchy: ['1', '1.2', '1.2.3', '1.2.3.c1']}));

  it('does not include category_id when category is expanded', () =>
    expect(mapper.toModel(product, ['category'])).to.not.have.property('category_id'));

  it('does not expand category when not found', () => {
    const mapped = mapper.toModel(productWithUnknownCategory, ['category']);
    expect(mapped).to.not.have.property('category');
    expect(mapped).to.have.property('category_id', 'unknown');
  });

  it('expands categories for multiple products', () => {
    const models = mapper.toModelArray([product, productWithUnknownCategory, product2], ['category']);

    expect(models).to.have.length(3);

    expect(models[0]).to.have.property('category');
    expect(models[0]).to.not.have.property('category_id');
    expect(models[0].category).to.deep.equal({id: 'c1', name: 'category', _metadata: {hierarchy: ['1', '1.2', '1.2.3', '1.2.3.c1']}});

    expect(models[1]).to.have.property('category_id');
    expect(models[1]).to.not.have.property('category');

    expect(models[2]).to.have.property('category');
    expect(models[2]).to.not.have.property('category_id');
    expect(models[2].category).to.deep.equal({id: 'c2', name: 'category2', _metadata: {hierarchy: ['1', '1.2', '1.2.3', '1.2.3.c1', '1.2.3.c1.c2']}});
  });
});
