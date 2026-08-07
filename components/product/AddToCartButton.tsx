'use client';

import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
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
      className="mt-4 rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
    >
      Agregar al carrito
    </button>
  );
}
