'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { filterProducts } from '@/lib/catalog/filter-products';
import type { Product, ProductFilters } from '@/lib/catalog/types';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { ProductGrid } from '@/components/catalog/ProductGrid';

export default function CatalogoPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({});

  useEffect(() => {
    fetchProducts(createSupabaseClient()).then(setAllProducts);
  }, []);

  const visibleProducts = filterProducts(allProducts, filters);

  return (
    <main className="px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Catálogo
      </h1>
      <CatalogFilters onFilterChange={setFilters} />
      <ProductGrid products={visibleProducts} />
    </main>
  );
}
