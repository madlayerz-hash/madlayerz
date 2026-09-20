'use client';

import { useMemo, useState } from 'react';
import { filterProducts } from '@/lib/catalog/filter-products';
import type { Product, ProductFilters } from '@/lib/catalog/types';
import { CatalogFilters, type CategoryOption } from './CatalogFilters';
import { ProductGrid } from './ProductGrid';

/**
 * Filtering stays on the client, but the product list now arrives from the
 * server already rendered — the page no longer fetches from Supabase inside a
 * useEffect, which left the catalog blank for crawlers, slow on mobile, and
 * spun up a second Supabase auth client in the browser.
 */
export function CatalogView({
  products,
  categories,
  initialCategory = '',
}: {
  products: Product[];
  categories: CategoryOption[];
  initialCategory?: string;
}) {
  const [filters, setFilters] = useState<ProductFilters>(
    initialCategory ? { category: initialCategory } : {}
  );
  const visibleProducts = useMemo(() => filterProducts(products, filters), [products, filters]);

  return (
    <>
      <CatalogFilters
        onFilterChange={setFilters}
        categories={categories}
        initialCategory={initialCategory}
      />
      <p className="mb-4 text-sm opacity-70" aria-live="polite">
        {visibleProducts.length} {visibleProducts.length === 1 ? 'producto' : 'productos'}
      </p>
      <ProductGrid products={visibleProducts} />
    </>
  );
}
