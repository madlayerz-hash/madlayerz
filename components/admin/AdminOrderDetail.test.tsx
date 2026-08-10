import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminOrderDetail } from './AdminOrderDetail';

const order = {
  id: 'order-1',
  customerName: 'Pablo Toro',
  customerEmail: 'pablo@example.com',
  status: 'pendiente_pago',
  totalClp: 7490,
  region: 'metropolitana',
  address: 'Av. Siempre Viva 123',
};

describe('AdminOrderDetail', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('shows the customer and order details', () => {
    render(<AdminOrderDetail order={order} onStatusChanged={vi.fn()} />);
    expect(screen.getByText('Pablo Toro')).toBeInTheDocument();
    expect(screen.getByText(/7\.490/)).toBeInTheDocument();
  });

  it('updates the status via the API when changed', async () => {
    const user = userEvent.setup();
    const onStatusChanged = vi.fn();
    render(<AdminOrderDetail order={order} onStatusChanged={onStatusChanged} />);

    await user.selectOptions(screen.getByLabelText('Estado'), 'pagado');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/orders/order-1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'pagado' }) })
    );
    await vi.waitFor(() => expect(onStatusChanged).toHaveBeenCalled());
  });
});
