'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatClp } from '@/lib/site';

interface OrderDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
}

const STATUSES: { value: string; label: string }[] = [
  { value: 'pendiente_pago', label: 'Pendiente de pago' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function AdminOrderDetail({ order, onStatusChanged }: { order: OrderDetail; onStatusChanged: () => void }) {
  const router = useRouter();
  const [error, setError] = useState('');

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setError('');

    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: e.target.value }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'No pudimos actualizar el estado.');
      return;
    }

    onStatusChanged();
    router.refresh();
  }

  return (
    <div className="glass-card flex flex-col gap-2 p-6">
      <p className="font-bold">{order.customerName}</p>
      <p className="text-sm opacity-80">
        <a href={`mailto:${order.customerEmail}`} className="underline">{order.customerEmail}</a>
      </p>
      {order.address && (
        <p className="text-sm opacity-80">
          {order.address}
          {order.region ? `, ${order.region}` : ''}
        </p>
      )}
      <p className="font-bold">{formatClp(order.totalClp)}</p>

      <label htmlFor={`estado-${order.id}`}>Estado</label>
      <select
        id={`estado-${order.id}`}
        defaultValue={order.status}
        onChange={handleStatusChange}
        className="rounded-full bg-transparent px-3 py-2"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
