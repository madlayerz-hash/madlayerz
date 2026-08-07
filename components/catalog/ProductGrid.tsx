import type { Product } from '@/lib/catalog/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="px-6 py-12 text-center">No encontramos productos con esos filtros.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-6 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
