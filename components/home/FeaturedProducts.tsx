import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

export function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured);

  if (featured.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="px-6 py-12">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
            Destacados
          </h2>
          <Link href="/catalogo" className="text-sm font-semibold underline">
            Ver todo
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
