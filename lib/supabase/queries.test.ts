import { describe, it, expect, vi } from 'vitest';
import { createOrder, createQuoteRequest, fetchOrdersForUser } from './queries';

describe('createOrder (RPC-based)', () => {
  it('calls the create_order RPC with the input and returns the id', async () => {
    const rpc = vi.fn(async () => ({ data: 'order-123', error: null }));
    const client = { rpc } as any;

    const id = await createOrder(client, {
      customerName: 'Pablo',
      customerEmail: 'pablo@example.com',
      customerPhone: '+56912345678',
      deliveryMethod: 'retiro',
      shippingCostClp: 0,
      paymentMethod: 'flow',
      subtotalClp: 3990,
      items: [{ productId: 'p1', quantity: 1, unitPriceClp: 3990 }],
    });

    expect(rpc).toHaveBeenCalledWith('create_order', {
      input: expect.objectContaining({ customerName: 'Pablo', subtotalClp: 3990 }),
    });
    expect(id).toBe('order-123');
  });
});

describe('createQuoteRequest (RPC-based)', () => {
  it('calls the create_quote_request RPC and returns the id', async () => {
    const rpc = vi.fn(async () => ({ data: 'quote-123', error: null }));
    const client = { rpc } as any;

    const id = await createQuoteRequest(client, {
      name: 'Pablo',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero 10 llaveros personalizados',
      quantity: 10,
    });

    expect(rpc).toHaveBeenCalledWith('create_quote_request', {
      input: expect.objectContaining({ name: 'Pablo', quantity: 10 }),
    });
    expect(id).toBe('quote-123');
  });
});

describe('fetchOrdersForUser', () => {
  it('queries orders matching user_id or customer_email, newest first', async () => {
    const order = vi.fn(async () => ({
      data: [{ id: 'o1', created_at: '2026-01-01', status: 'pendiente_pago', total_clp: 3990 }],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as any;

    const orders = await fetchOrdersForUser(client, 'u1', 'pablo@example.com');

    expect(from).toHaveBeenCalledWith('orders');
    expect(or).toHaveBeenCalledWith('user_id.eq.u1,customer_email.eq.pablo@example.com');
    expect(orders).toEqual([{ id: 'o1', createdAt: '2026-01-01', status: 'pendiente_pago', totalClp: 3990 }]);
  });
});
