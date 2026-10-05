import type { Metadata } from 'next';
import type { Product } from '@/lib/catalog/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { SITE_DESCRIPTION } from '@/lib/site';
import { Hero } from '@/components/home/Hero';
import { HeroPiece } from '@/components/home/hero-3d/HeroPiece';
import { Marquee } from '@/components/home/Marquee';
import { FeaturedBento } from '@/components/home/FeaturedBento';
import { ProcessSteps } from '@/components/home/ProcessSteps';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { QuoteCta } from '@/components/home/QuoteCta';

/**
 * Without this the home page is baked at build time and never updates: it kept
 * showing products the admin had already deleted (and linking to their 404s)
 * while hiding newly created ones. Admin writes also call revalidatePath('/'),
 * so this is the safety net rather than the only refresh path.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  description: SITE_DESCRIPTION,
};

export default async function Page() {
  let products: Product[] = [];

  try {
    products = await fetchProducts(createSupabaseClient());
  } catch {
    // A Supabase outage should still render the hero and the quote CTA.
    products = [];
  }

  return (
    <main>
      <Hero art={<HeroPiece />} />
      <Marquee />
      <FeaturedBento products={products} />
      <ProcessSteps />
      <CategoryTiles />
      <QuoteCta />
    </main>
  );
}
