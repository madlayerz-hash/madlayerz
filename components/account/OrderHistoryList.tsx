import type { OrderSummary } from '@/lib/supabase/queries';

export function OrderHistoryList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return <p>Aún no tienes pedidos.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id} className="glass-surface flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="font-semibold">Pedido {order.id.slice(0, 8)}</p>
            <p className="text-sm opacity-80">{new Date(order.createdAt).toLocaleDateString('es-CL')} — {order.status}</p>
          </div>
          <p className="font-bold">${order.totalClp.toLocaleString('es-CL')}</p>
        </li>
      ))}
    </ul>
  );
}
