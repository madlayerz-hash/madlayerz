'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { fetchAddresses, type Address } from '@/lib/supabase/queries';
import type { ShippingInfoInput, DeliveryInput, PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { formatClp } from '@/lib/site';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';

type Step = 'shipping' | 'delivery' | 'payment' | 'done';

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'shipping', label: 'Datos' },
  { key: 'delivery', label: 'Entrega' },
  { key: 'payment', label: 'Pago' },
];

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingInfoInput | null>(null);
  const [delivery, setDelivery] = useState<{ data: DeliveryInput; cost: number } | null>(null);
  const [order, setOrder] = useState<{ id: string; totalClp: number } | null>(null);
  const [initialValues, setInitialValues] = useState<{ name: string; email: string } | undefined>();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const clear = useCartStore((state) => state.clear);

  // The cart is restored from localStorage after hydration; without this the
  // page would flash "tu carrito está vacío" on every load.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    async function loadSessionData() {
      try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        if (!user) return;

        setInitialValues({ name: (user.user_metadata?.name as string) ?? '', email: user.email ?? '' });
        const addresses = await fetchAddresses(client, user.id);
        setSavedAddresses(addresses);
      } catch {
        // No session — guest checkout proceeds with empty defaults.
      }
    }

    loadSessionData();
  }, []);

  async function handlePaymentConfirm(paymentMethod: PaymentMethodInput) {
    if (!shipping || !delivery || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: shipping.name,
          customerEmail: shipping.email,
          customerPhone: shipping.phone,
          deliveryMethod: delivery.data.method,
          region: delivery.data.method === 'domicilio' ? delivery.data.region : undefined,
          address: delivery.data.method === 'domicilio' ? delivery.data.address : undefined,
          paymentMethod,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.orderId) {
        // The cart is deliberately NOT cleared here: the customer keeps what
        // they picked and can retry.
        setError(result.error ?? 'No pudimos registrar tu pedido. Inténtalo de nuevo.');
        return;
      }

      setOrder({ id: result.orderId, totalClp: result.totalClp ?? subtotalClp + delivery.cost });
      clear();
      setStep('done');
    } catch {
      setError('No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalClp = subtotalClp + (delivery?.cost ?? 0);

  if (mounted && items.length === 0 && step !== 'done') {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
          Tu carrito está vacío
        </h1>
        <p className="mb-6 opacity-80">Agrega algo del catálogo para continuar con la compra.</p>
        <Link href="/catalogo" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
          Ver catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-4 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Checkout
      </h1>

      {step !== 'done' && (
        <>
          <ol className="mb-6 flex gap-2 text-sm">
            {STEP_LABELS.map((s, index) => {
              const currentIndex = STEP_LABELS.findIndex((x) => x.key === step);
              const state = index < currentIndex ? 'hecho' : index === currentIndex ? 'actual' : 'pendiente';
              return (
                <li
                  key={s.key}
                  aria-current={state === 'actual' ? 'step' : undefined}
                  className={`flex-1 rounded-full px-3 py-1 text-center ${
                    state === 'pendiente' ? 'opacity-50' : ''
                  } ${state === 'actual' ? 'bg-brand font-semibold text-white' : 'glass-surface'}`}
                >
                  {index + 1}. {s.label}
                </li>
              );
            })}
          </ol>

          <div className="glass-surface mb-6 flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
            <span>
              {items.reduce((sum, i) => sum + i.quantity, 0)} artículo(s)
              {delivery ? ` · despacho ${formatClp(delivery.cost)}` : ''}
            </span>
            <strong>{formatClp(totalClp)}</strong>
          </div>
        </>
      )}

      {step === 'shipping' && (
        <ShippingStep initialValues={initialValues} onContinue={(data) => { setShipping(data); setStep('delivery'); }} />
      )}
      {step === 'delivery' && (
        <DeliveryStep savedAddresses={savedAddresses} onContinue={(data, cost) => { setDelivery({ data, cost }); setStep('payment'); }} />
      )}
      {step === 'payment' && (
        <PaymentStep onConfirm={handlePaymentConfirm} totalClp={totalClp} submitting={submitting} error={error} />
      )}
      {step === 'done' && order && <ConfirmationScreen orderId={order.id} totalClp={order.totalClp} />}
    </main>
  );
}
