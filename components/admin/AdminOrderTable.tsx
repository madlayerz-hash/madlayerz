'use client';

import { useState } from 'react';
import { AdminOrderDetail } from './AdminOrderDetail';

interface OrderRow {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
}

export function AdminOrderTable({ orders }: { orders: OrderRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {orders.map((order) => (
        <div key={order.id}>
          <button
            onClick={() => setOpenId(openId === order.id ? null : order.id)}
            className="glass-surface flex w-full items-center justify-between rounded-2xl p-4 text-left"
          >
            <span>{order.customerName} — {order.id.slice(0, 8)}</span>
            <span>{order.status}</span>
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
