import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

export function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured);

  return (
    <ScrollReveal>
      <section className="px-6 py-12">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
          Destacados
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
