'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';

/** El carrito se vacía recién cuando el pago está confirmado, no antes. */
export function ClearCartOnPaid() {
  const clear = useCartStore((state) => state.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
