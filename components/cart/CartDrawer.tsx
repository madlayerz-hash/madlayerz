'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart/cart-store';
import { CartItemRow } from './CartItemRow';

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeDrawer}>
      <div
        className="glass-card m-4 flex w-full max-w-sm flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tu carrito</h2>
          <button aria-label="Cerrar carrito" onClick={closeDrawer}>✕</button>
        </div>

        {items.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex justify-between font-bold">
                <span>Subtotal</span>
                <span>${subtotalClp.toLocaleString('es-CL')}</span>
              </div>
              <button
                onClick={() => {
                  closeDrawer();
                  router.push('/checkout');
                }}
                className="mt-4 w-full rounded-full bg-brand py-3 font-semibold text-white transition-transform hover:scale-105"
              >
                Ir a pagar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
