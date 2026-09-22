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
  const [method, setMethod] = useState<PaymentMethodInput>('mercadopago');

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de pago</h2>

      {totalClp !== undefined && (
        <p className="text-xl font-bold" style={{ color: 'var(--accent-text)' }}>
          Total a pagar: {formatClp(totalClp)}
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Método de pago</legend>

        <label className="flex items-start gap-3 rounded-2xl border border-current/20 p-3">
          <input
            type="radio"
            name="payment"
            className="mt-1"
            checked={method === 'mercadopago'}
            onChange={() => setMethod('mercadopago')}
          />
          <span>
            <span className="block font-semibold">Mercado Pago</span>
            <span className="block text-sm opacity-75">
              Tarjeta de crédito, débito o saldo en Mercado Pago.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-current/10 p-3 opacity-50">
          <input type="radio" name="payment" className="mt-1" disabled checked={false} onChange={() => {}} />
          <span>
            <span className="block font-semibold">Flow</span>
            <span className="block text-sm">Próximamente</span>
          </span>
        </label>
      </fieldset>

      <p className="text-sm opacity-75">
        Te llevaremos a Mercado Pago para pagar de forma segura. Al terminar vuelves aquí y tu pedido
        queda confirmado.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={() => onConfirm(method)}
        disabled={submitting}
        className="rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Conectando con Mercado Pago...' : 'Pagar con Mercado Pago'}
      </button>
    </div>
  );
}
