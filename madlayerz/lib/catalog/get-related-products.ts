import type { Product } from './types';

export function getRelatedProducts(products: Product[], current: Product, limit = 4): Product[] {
  return products
    .filter((product) => product.id !== current.id && product.categorySlug === current.categorySlug)
    .slice(0, limit);
}
