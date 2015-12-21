'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const stubCategories = {
  c1: {
    name: 'category',
    hierachy: '1.2.3.c1'
  }
};

const mapper = proxyquire('../lib/product_mapper', {'./categories-api/categories.json': stubCategories});

const product = {id: '1', category_id: 'c1'};

describe.only('Product mapper', () => {
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
    const mapped = mapper.toModel({id: '1', category_id: 'unknown'}, ['category']);
    expect(mapped).to.not.have.property('category');
    expect(mapped).to.have.property('category_id', 'unknown');
  });
});
