import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';

const sampleItem = {
  productId: '1',
  slug: 'llavero-baby',
  name: 'Llavero Baby Yoda',
  unitPriceClp: 3990,
  imageUrl: '/img/1.jpg',
};

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('adds a new item with default quantity 1', () => {
    useCartStore.getState().addItem(sampleItem);
    expect(useCartStore.getState().items).toEqual([{ ...sampleItem, quantity: 1 }]);
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().addItem(sampleItem, 2);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('updates quantity directly', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().updateQuantity('1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes the item when quantity is set to 0 or less', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().updateQuantity('1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes an item explicitly', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().removeItem('1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clears all items', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes the subtotal', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    expect(useCartStore.getState().subtotalClp()).toBe(7980);
  });
});
