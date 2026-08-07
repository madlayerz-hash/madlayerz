import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="px-6 py-12">
      <h2 className="mb-6 text-xl font-bold" style={{ color: 'var(--heading)' }}>
        También te puede gustar
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
