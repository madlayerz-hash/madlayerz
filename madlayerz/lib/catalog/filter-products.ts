import type { Product, ProductFilters } from './types';

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (filters.category && product.categorySlug !== filters.category) return false;
    if (filters.minPrice !== undefined && product.priceClp < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.priceClp > filters.maxPrice) return false;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(query);
      const matchesDescription = product.description.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) return false;
    }

    return true;
  });
}
