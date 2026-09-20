import type { Product } from '@/lib/catalog/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="py-12 text-center">No encontramos productos con esos filtros.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        // The first row is above the fold: let it load eagerly so the LCP
        // image isn't waiting on lazy-loading.
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
