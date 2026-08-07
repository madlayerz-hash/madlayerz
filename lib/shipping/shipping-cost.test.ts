import { describe, it, expect } from 'vitest';
import { calculateShippingCost } from './shipping-cost';

describe('calculateShippingCost', () => {
  it('returns 0 for pickup regardless of region', () => {
    expect(calculateShippingCost('retiro')).toBe(0);
  });

  it('returns the fixed cost for a known region', () => {
    expect(calculateShippingCost('domicilio', 'metropolitana')).toBe(3500);
    expect(calculateShippingCost('domicilio', 'los-lagos')).toBe(6500);
  });

  it('throws when domicilio is chosen without a region', () => {
    expect(() => calculateShippingCost('domicilio')).toThrow('region is required for domicilio delivery');
  });
});
