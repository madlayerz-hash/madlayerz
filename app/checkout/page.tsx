'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { fetchAddresses, type Address } from '@/lib/supabase/queries';
import type { ShippingInfoInput, DeliveryInput, PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';

type Step = 'shipping' | 'delivery' | 'payment' | 'done';

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingInfoInput | null>(null);
  const [delivery, setDelivery] = useState<{ data: DeliveryInput; cost: number } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<{ name: string; email: string } | undefined>();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const clear = useCartStore((state) => state.clear);

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
        // No session — guest checkout proceeds with empty defaults, unchanged from Fase 1.
      }
    }

    loadSessionData();
  }, []);

  async function handlePaymentConfirm(paymentMethod: PaymentMethodInput) {
    if (!shipping || !delivery) return;

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
        shippingCostClp: delivery.cost,
        paymentMethod,
        subtotalClp,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceClp: i.unitPriceClp })),
      }),
    });

    const result = await response.json();
    setOrderId(result.orderId);
    clear();
    setStep('done');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Checkout
      </h1>

      {step === 'shipping' && (
        <ShippingStep initialValues={initialValues} onContinue={(data) => { setShipping(data); setStep('delivery'); }} />
      )}
      {step === 'delivery' && (
        <DeliveryStep savedAddresses={savedAddresses} onContinue={(data, cost) => { setDelivery({ data, cost }); setStep('payment'); }} />
      )}
      {step === 'payment' && <PaymentStep onConfirm={handlePaymentConfirm} />}
      {step === 'done' && orderId && <ConfirmationScreen orderId={orderId} />}
    </main>
  );
}
