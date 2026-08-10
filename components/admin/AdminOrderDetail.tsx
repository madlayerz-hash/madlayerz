'use client';

import { useRouter } from 'next/navigation';

interface OrderDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
}

const STATUSES = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];

export function AdminOrderDetail({ order, onStatusChanged }: { order: OrderDetail; onStatusChanged: () => void }) {
  const router = useRouter();

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: e.target.value }),
    });
    onStatusChanged();
    router.refresh();
  }

  return (
    <div className="glass-card flex flex-col gap-2 p-6">
      <p className="font-bold">{order.customerName}</p>
      <p className="text-sm opacity-80">{order.customerEmail}</p>
      {order.address && <p className="text-sm opacity-80">{order.address}</p>}
      <p className="font-bold">${order.totalClp.toLocaleString('es-CL')}</p>
      <label htmlFor="status">Estado</label>
      <select id="status" defaultValue={order.status} onChange={handleStatusChange} className="rounded-full bg-transparent px-3 py-2">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
