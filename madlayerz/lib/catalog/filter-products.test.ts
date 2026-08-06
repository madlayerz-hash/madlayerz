import { describe, it, expect } from 'vitest';
import { filterProducts } from './filter-products';
import type { Product } from './types';

const products: Product[] = [
  { id: '1', slug: 'llavero-baby', name: 'Llavero Baby Yoda', description: 'Llavero divertido', priceClp: 3990, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/img/1.jpg', featured: true },
  { id: '2', slug: 'macetero-geo', name: 'Macetero Geométrico', description: 'Macetero moderno para plantas', priceClp: 8500, categorySlug: 'maceteros', categoryName: 'Maceteros', imageUrl: '/img/2.jpg', featured: false },
  { id: '3', slug: 'figura-dragon', name: 'Figura Dragón', description: 'Figura decorativa de dragón', priceClp: 12000, categorySlug: 'figuras-decorativas', categoryName: 'Figuras Decorativas', imageUrl: '/img/3.jpg', featured: true },
];

describe('filterProducts', () => {
  it('returns all products when no filters are given', () => {
    expect(filterProducts(products, {})).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = filterProducts(products, { category: 'maceteros' });
    expect(result).toEqual([products[1]]);
  });

  it('filters by min and max price', () => {
    const result = filterProducts(products, { minPrice: 5000, maxPrice: 10000 });
    expect(result).toEqual([products[1]]);
  });

  it('filters by case-insensitive search across name and description', () => {
    const result = filterProducts(products, { search: 'dragón' });
    expect(result).toEqual([products[2]]);
  });

  it('combines multiple filters', () => {
    const result = filterProducts(products, { category: 'llaveros', search: 'yoda' });
    expect(result).toEqual([products[0]]);
  });
});
