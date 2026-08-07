import { describe, it, expect } from 'vitest';
import { getRelatedProducts } from './get-related-products';
import type { Product } from './types';

const products: Product[] = [
  { id: '1', slug: 'a', name: 'A', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '2', slug: 'b', name: 'B', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '3', slug: 'c', name: 'C', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '4', slug: 'd', name: 'D', description: '', priceClp: 1000, categorySlug: 'maceteros', categoryName: 'Maceteros', imageUrl: '', featured: false },
];

describe('getRelatedProducts', () => {
  it('excludes the current product', () => {
    const result = getRelatedProducts(products, products[0]);
    expect(result.some((p) => p.id === products[0].id)).toBe(false);
  });

  it('only includes products from the same category', () => {
    const result = getRelatedProducts(products, products[0]);
    expect(result.every((p) => p.categorySlug === 'llaveros')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const result = getRelatedProducts(products, products[0], 1);
    expect(result).toHaveLength(1);
  });
});
