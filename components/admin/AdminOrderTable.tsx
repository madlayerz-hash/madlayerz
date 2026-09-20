'use client';

import { useState } from 'react';
import { formatClp } from '@/lib/site';
import { AdminOrderDetail } from './AdminOrderDetail';

interface OrderRow {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
  createdAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function AdminOrderTable({ orders }: { orders: OrderRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <div key={order.id}>
          <button
            onClick={() => setOpenId(openId === order.id ? null : order.id)}
            aria-expanded={openId === order.id}
            className="glass-surface flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl p-4 text-left"
          >
            <span className="font-semibold">
              {order.customerName} <span className="font-normal opacity-60">#{order.id.slice(0, 8).toUpperCase()}</span>
            </span>
            <span className="text-sm opacity-70">
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-CL') : null} · {formatClp(order.totalClp)}
            </span>
            <span className="rounded-full bg-brand/15 px-3 py-1 text-sm">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </button>
          {openId === order.id && (
            <div className="mt-2">
              <AdminOrderDetail order={order} onStatusChanged={() => {}} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
