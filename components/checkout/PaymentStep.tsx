'use client';

import { useState } from 'react';
import type { PaymentMethodInput } from '@/lib/validation/checkout-schema';

export function PaymentStep({ onConfirm }: { onConfirm: (method: PaymentMethodInput) => void }) {
  const [method, setMethod] = useState<PaymentMethodInput>('flow');

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de pago</h2>
      <p className="text-sm opacity-80">
        El pago aún no se procesa realmente — tu pedido quedará como &quot;pendiente de pago&quot; y te
        contactaremos para coordinar el cobro.
      </p>

      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={method === 'flow'} onChange={() => setMethod('flow')} />
        Flow
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={method === 'mercadopago'} onChange={() => setMethod('mercadopago')} />
        Mercado Pago
      </label>

      <button onClick={() => onConfirm(method)} className="rounded-full bg-brand py-3 font-semibold text-white">
        Confirmar pedido
      </button>
    </div>
  );
}
