'use client';

import { useState } from 'react';
import type { PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { formatClp } from '@/lib/site';

export function PaymentStep({
  onConfirm,
  totalClp,
  submitting = false,
  error,
}: {
  onConfirm: (method: PaymentMethodInput) => void;
  totalClp?: number;
  submitting?: boolean;
  error?: string;
}) {
  const [method, setMethod] = useState<PaymentMethodInput>('flow');

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de pago</h2>

      {totalClp !== undefined && (
        <p className="text-xl font-bold" style={{ color: 'var(--accent-text)' }}>
          Total a pagar: {formatClp(totalClp)}
        </p>
      )}

      <p className="text-sm opacity-80">
        El pago aún no se procesa en línea — tu pedido queda como &quot;pendiente de pago&quot; y te
        contactamos para coordinar el cobro.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Método de pago</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="payment" checked={method === 'flow'} onChange={() => setMethod('flow')} />
          Flow
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="payment" checked={method === 'mercadopago'} onChange={() => setMethod('mercadopago')} />
          Mercado Pago
        </label>
      </fieldset>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={() => onConfirm(method)}
        disabled={submitting}
        className="rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
      </button>
    </div>
  );
}
