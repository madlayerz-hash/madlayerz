import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';

export function FeaturedBento({ products }: { products: Product[] }) {
  // La primera celda ocupa 2×2: con 5 piezas la grilla de 4 columnas queda en dos filas
  // completas; con 7 sobraban dos huecos al final.
  const featured = products.filter((p) => p.featured).slice(0, 5);

  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--heading)' }}>
            Destacados
          </h2>
        </div>
        <Link href="/catalogo" className="inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:underline">
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {featured.map((product, index) => (
          <div key={product.id} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
            <ProductCard product={product} priority={index < 2} large={index === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
