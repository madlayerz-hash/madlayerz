'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
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

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const clear = useCartStore((state) => state.clear);

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
        <ShippingStep onContinue={(data) => { setShipping(data); setStep('delivery'); }} />
      )}
      {step === 'delivery' && (
        <DeliveryStep onContinue={(data, cost) => { setDelivery({ data, cost }); setStep('payment'); }} />
      )}
      {step === 'payment' && <PaymentStep onConfirm={handlePaymentConfirm} />}
      {step === 'done' && orderId && <ConfirmationScreen orderId={orderId} />}
    </main>
  );
}
