import { describe, it, expect } from 'vitest';
import { buildOrderConfirmationEmail } from './order-confirmation';

const base = {
  orderId: 'a1b2c3d4-0000-0000-0000-000000000000',
  customerName: 'Pablo',
  items: [
    { name: 'Llavero Baby Yoda', quantity: 2, unitPriceClp: 3990 },
    { name: 'Macetero Geométrico', quantity: 1, unitPriceClp: 8500 },
  ],
  subtotalClp: 16480,
  shippingCostClp: 3500,
  deliveryMethod: 'domicilio' as const,
  region: 'metropolitana',
  address: 'Av. Siempre Viva 742',
};

describe('buildOrderConfirmationEmail', () => {
  it('puts a short order id in the subject', () => {
    expect(buildOrderConfirmationEmail(base).subject).toContain('A1B2C3D4');
  });

  it('adds shipping to the subtotal for the total', () => {
    const { text } = buildOrderConfirmationEmail(base);
    expect(text).toContain('Total: $19.980');
  });

  it('lists every line item with its line total', () => {
    const { text } = buildOrderConfirmationEmail(base);
    expect(text).toContain('2 × Llavero Baby Yoda — $7.980');
    expect(text).toContain('1 × Macetero Geométrico — $8.500');
  });

  it('describes pickup instead of an address when the customer collects the order', () => {
    const { text } = buildOrderConfirmationEmail({
      ...base,
      deliveryMethod: 'retiro',
      region: null,
      address: null,
      shippingCostClp: 0,
    });

    expect(text).toContain('Retiro coordinado');
    expect(text).not.toContain('Av. Siempre Viva');
  });

  it('escapes HTML in customer-supplied values', () => {
    const { html } = buildOrderConfirmationEmail({ ...base, customerName: '<script>x</script>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
