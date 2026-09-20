'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';
import { PLACEHOLDER_IMAGE, formatClp } from '@/lib/site';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const [src, setSrc] = useState(product.imageUrl || PLACEHOLDER_IMAGE);

  const variants = product.variants ?? [];
  // With more than one colour the choice belongs on the ficha — adding a
  // colour the shopper never picked is how you get returns.
  const hasChoice = variants.length > 0;

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 12px 30px rgba(34,197,94,0.25)' }}
      className="glass-card flex flex-col p-4"
    >
      <Link href={`/producto/${product.slug}`} className="group">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
          <Image
            src={src}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            onError={() => setSrc(PLACEHOLDER_IMAGE)}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <h3 className="mt-3 font-semibold">{product.name}</h3>
      </Link>

      <p className="mt-1 font-bold" style={{ color: 'var(--accent-text)' }}>
        {formatClp(product.priceClp)}
      </p>

      {hasChoice && (
        <div className="mt-2 flex items-center gap-1.5" aria-label={`${variants.length} colores disponibles`}>
          {variants.slice(0, 5).map((variant) => (
            <span
              key={variant.name}
              title={variant.name}
              className="h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ background: variant.colorHex ?? 'transparent' }}
            />
          ))}
          <span className="text-xs opacity-60">{variants.length} colores</span>
        </div>
      )}

      {hasChoice ? (
        <Link
          href={`/producto/${product.slug}`}
          className="mt-3 rounded-full border border-current px-4 py-2 text-center text-sm font-semibold transition-transform hover:scale-105"
        >
          Elegir color
        </Link>
      ) : (
        <button
          onClick={() => {
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              unitPriceClp: product.priceClp,
              imageUrl: product.imageUrl,
            });
            openDrawer();
          }}
          className="mt-3 rounded-full bg-brand py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          Agregar al carrito
        </button>
      )}
    </motion.div>
  );
}
