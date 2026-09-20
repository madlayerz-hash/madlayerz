'use client';

import Image from 'next/image';
import { useCartStore, type CartItem } from '@/lib/cart/cart-store';
import { PLACEHOLDER_IMAGE, formatClp } from '@/lib/site';

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const label = item.variantName ? `${item.name} (${item.variantName})` : item.name;

  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-3">
      <Image
        src={item.imageUrl || PLACEHOLDER_IMAGE}
        alt=""
        width={56}
        height={56}
        className="h-14 w-14 rounded-lg object-cover"
      />
      <div className="flex-1">
        <p className="font-semibold">{item.name}</p>
        {item.variantName && <p className="text-xs opacity-70">Color: {item.variantName}</p>}
        <p className="text-sm">{formatClp(item.unitPriceClp)}</p>
        <div className="mt-1 flex items-center gap-2">
          <button
            aria-label={`Quitar una unidad de ${label}`}
            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantName)}
            className="h-7 w-7 rounded-full border border-current leading-none"
          >
            −
          </button>
          <span aria-live="polite">{item.quantity}</span>
          <button
            aria-label={`Agregar una unidad de ${label}`}
            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantName)}
            className="h-7 w-7 rounded-full border border-current leading-none"
          >
            +
          </button>
          <button
            onClick={() => removeItem(item.productId, item.variantName)}
            className="ml-2 text-sm text-red-500"
          >
            Quitar
          </button>
        </div>
      </div>
      <p className="font-semibold">{formatClp(item.unitPriceClp * item.quantity)}</p>
    </div>
  );
}
