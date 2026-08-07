'use client';

import { useCartStore, type CartItem } from '@/lib/cart/cart-store';

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-3">
      <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
      <div className="flex-1">
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm">${item.unitPriceClp.toLocaleString('es-CL')}</p>
        <div className="mt-1 flex items-center gap-2">
          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
          <button onClick={() => removeItem(item.productId)} className="ml-2 text-sm text-red-500">
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}
