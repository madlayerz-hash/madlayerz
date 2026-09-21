import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminOrderTable } from '@/components/admin/AdminOrderTable';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalClp: number;
  region: string | null;
  address: string | null;
  createdAt: string;
}

export default async function AdminPedidosPage() {
  const client = await createServerSupabaseClient();
  const { data: orders } = await client
    .from('orders')
    .select('id, customer_name, customer_email, status, total_clp, region, address, created_at')
    .order('created_at', { ascending: false });

  const rows: OrderRow[] = (orders ?? []).map((o: {
    id: string;
    customer_name: string;
    customer_email: string;
    status: string;
    total_clp: number;
    region: string | null;
    address: string | null;
    created_at: string;
  }) => ({
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    status: o.status,
    totalClp: o.total_clp,
    region: o.region,
    address: o.address,
    createdAt: o.created_at,
  }));

  const pending = rows.filter((o) => o.status === 'pendiente_pago').length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Pedidos
      </h1>
      <p className="mb-6 opacity-75">
        {pending} pendiente{pending === 1 ? '' : 's'} de pago · {rows.length} en total
      </p>
      {rows.length === 0 ? <p className="opacity-70">Aún no hay pedidos.</p> : <AdminOrderTable orders={rows} />}
    </div>
  );
}
