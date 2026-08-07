import { describe, it, expect } from 'vitest';
import { quoteRequestSchema } from './quote-schema';

describe('quoteRequestSchema', () => {
  it('accepts a valid quote request', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'not-an-email',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a quantity of zero or less', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('treats budgetClp as optional', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });
});
