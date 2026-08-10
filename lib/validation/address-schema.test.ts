import { describe, it, expect } from 'vitest';
import { addressSchema } from './address-schema';

describe('addressSchema', () => {
  it('accepts a valid address', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty label', () => {
    const result = addressSchema.safeParse({
      label: '',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an address that is too short', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'metropolitana',
      address: 'ab',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid region', () => {
    const result = addressSchema.safeParse({
      label: 'Casa',
      region: 'not-a-region',
      address: 'Av. Siempre Viva 123',
      isDefault: false,
    });
    expect(result.success).toBe(false);
  });
});
