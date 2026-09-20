import type { MetadataRoute } from 'next';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalogo`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/cotizacion`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const products = await fetchProducts(createSupabaseClient());
    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: `${SITE_URL}/producto/${product.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
