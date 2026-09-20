import { describe, it, expect } from 'vitest';
import { priceOrder, UnknownProductError, UnknownVariantError } from './price-order';

const catalog = new Map([
  ['p1', { name: 'Llavero Calavera', priceClp: 3500 }],
  ['p2', { name: 'Busto Rostro', priceClp: 12900, variantNames: ['Negro', 'Verde'] }],
]);

describe('priceOrder', () => {
  it('ignores the price the client sent and uses the catalog price', () => {
    const { items, subtotalClp } = priceOrder([{ productId: 'p1', quantity: 2 }], catalog);

    expect(items[0].unitPriceClp).toBe(3500);
    expect(subtotalClp).toBe(7000);
  });

  it('adds up every line', () => {
    const { subtotalClp } = priceOrder(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 2, variantName: 'Negro' },
      ],
      catalog
    );

    expect(subtotalClp).toBe(3500 + 12900 * 2);
  });

  it('merges duplicated product ids into one line', () => {
    const { items } = priceOrder(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p1', quantity: 3 },
      ],
      catalog
    );

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(4);
  });

  it('keeps two colours of the same product as separate lines', () => {
    const { items } = priceOrder(
      [
        { productId: 'p2', quantity: 1, variantName: 'Negro' },
        { productId: 'p2', quantity: 2, variantName: 'Verde' },
      ],
      catalog
    );

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.variantName).sort()).toEqual(['Negro', 'Verde']);
  });

  it('carries the chosen colour onto the priced line', () => {
    const { items } = priceOrder([{ productId: 'p2', quantity: 1, variantName: 'Verde' }], catalog);
    expect(items[0].variantName).toBe('Verde');
  });

  it('rejects a product that is not in the catalog', () => {
    expect(() => priceOrder([{ productId: 'ghost', quantity: 1 }], catalog)).toThrow(UnknownProductError);
  });

  it('rejects a colour the product does not offer', () => {
    expect(() => priceOrder([{ productId: 'p2', quantity: 1, variantName: 'Dorado' }], catalog)).toThrow(
      UnknownVariantError
    );
  });
});
