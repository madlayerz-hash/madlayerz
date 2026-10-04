'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';
import { PLACEHOLDER_IMAGE, formatClp } from '@/lib/site';
import { LayerReveal } from '@/components/motion/LayerReveal';

export function ProductCard({
  product,
  priority = false,
  large = false,
}: {
  product: Product;
  priority?: boolean;
  large?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const [src, setSrc] = useState(product.imageUrl || PLACEHOLDER_IMAGE);

  const variants = product.variants ?? [];
  // With more than one colour the choice belongs on the ficha — adding a
  // colour the shopper never picked is how you get returns.
  const hasChoice = variants.length > 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-[color:var(--accent)]"
    >
      <Link href={`/producto/${product.slug}`} className="flex flex-1 flex-col">
        <LayerReveal className="relative w-full flex-1 overflow-hidden rounded-xl bg-surface-2">
          <div className="relative aspect-square h-full w-full">
            <Image
              src={src}
              alt={product.name}
              fill
              sizes={large ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
              priority={priority}
              onError={() => setSrc(PLACEHOLDER_IMAGE)}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        </LayerReveal>
        <h3 className={`mt-3 font-medium tracking-tight ${large ? 'text-xl' : 'text-base'}`} style={{ color: 'var(--heading)' }}>
          {product.name}
        </h3>
      </Link>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-accent-text">{formatClp(product.priceClp)}</p>
        {hasChoice && (
          <div className="flex items-center gap-1" aria-label={`${variants.length} colores disponibles`}>
            {variants.slice(0, 5).map((variant) => (
              <span
                key={variant.name}
                title={variant.name}
                className="h-3 w-3 rounded-full border border-line"
                style={{ background: variant.colorHex ?? 'transparent' }}
              />
            ))}
          </div>
        )}
      </div>

      {hasChoice ? (
        <Link
          href={`/producto/${product.slug}`}
          className="mt-3 rounded-full border border-line px-4 py-2 text-center text-sm font-medium transition-colors hover:border-[color:var(--accent)]"
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
          className="mt-3 rounded-full bg-accent py-2 text-sm font-medium text-on-accent transition-transform active:scale-[0.98]"
        >
          Agregar al carrito
        </button>
      )}
    </motion.div>
  );
}
