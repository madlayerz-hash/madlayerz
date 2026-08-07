import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { Hero } from '@/components/home/Hero';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryChips } from '@/components/home/CategoryChips';
import { QuoteBanner } from '@/components/home/QuoteBanner';

export default async function Page() {
  const products = await fetchProducts(createSupabaseClient());

  return (
    <main>
      <Hero />
      <FeaturedProducts products={products} />
      <CategoryChips />
      <QuoteBanner />
    </main>
  );
}
