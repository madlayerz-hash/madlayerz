'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 12px 30px rgba(34,197,94,0.25)' }}
      className="glass-card flex flex-col p-4"
    >
      <Link href={`/producto/${product.slug}`}>
        <img src={product.imageUrl} alt={product.name} className="h-40 w-full rounded-xl object-cover" />
        <h3 className="mt-3 font-semibold">{product.name}</h3>
      </Link>
      <p className="mt-1 font-bold" style={{ color: 'var(--accent)' }}>
        ${product.priceClp.toLocaleString('es-CL')}
      </p>
      <button
        onClick={() =>
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            unitPriceClp: product.priceClp,
            imageUrl: product.imageUrl,
          })
        }
        className="mt-3 rounded-full bg-brand py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Agregar al carrito
      </button>
    </motion.div>
  );
}
