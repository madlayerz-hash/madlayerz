import { describe, it, expect } from 'vitest';
import { shippingInfoSchema, deliverySchema, paymentMethodSchema } from './checkout-schema';

describe('shippingInfoSchema', () => {
  it('accepts valid contact info', () => {
    const result = shippingInfoSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
    });
    expect(result.success).toBe(true);
  });
});

describe('deliverySchema', () => {
  it('accepts retiro without address fields', () => {
    const result = deliverySchema.safeParse({ method: 'retiro' });
    expect(result.success).toBe(true);
  });

  it('requires region and address for domicilio', () => {
    const result = deliverySchema.safeParse({ method: 'domicilio' });
    expect(result.success).toBe(false);
  });

  it('accepts domicilio with region and address', () => {
    const result = deliverySchema.safeParse({
      method: 'domicilio',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
    });
    expect(result.success).toBe(true);
  });
});

describe('paymentMethodSchema', () => {
  it('accepts flow and mercadopago only', () => {
    expect(paymentMethodSchema.safeParse('flow').success).toBe(true);
    expect(paymentMethodSchema.safeParse('mercadopago').success).toBe(true);
    expect(paymentMethodSchema.safeParse('webpay').success).toBe(false);
  });
});
