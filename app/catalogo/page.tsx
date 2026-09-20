import type { Metadata } from 'next';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchCategories, fetchProducts } from '@/lib/supabase/queries';
import type { Product } from '@/lib/catalog/types';
import type { CategoryOption } from '@/components/catalog/CatalogFilters';
import { CatalogView } from '@/components/catalog/CatalogView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Catálogo',
  description:
    'Todos nuestros productos impresos en 3D: llaveros, figuras de personajes, figuras decorativas, maceteros y juguetes. Envío a todo Chile.',
  alternates: { canonical: '/catalogo' },
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  let products: Product[] = [];
  let categories: CategoryOption[] = [];

  try {
    const client = createSupabaseClient();
    [products, categories] = await Promise.all([fetchProducts(client), fetchCategories(client)]);
  } catch {
    products = [];
    categories = [];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Catálogo
      </h1>
      {/* The category chips on the home page link here with ?category=…; before
          this the parameter was ignored and every chip showed the full list. */}
      <CatalogView
        products={products}
        categories={categories}
        initialCategory={searchParams?.category ?? ''}
      />
    </main>
  );
}
