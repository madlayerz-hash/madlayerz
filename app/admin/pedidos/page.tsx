import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminOrderTable } from '@/components/admin/AdminOrderTable';

export default async function AdminPedidosPage() {
  const client = await createServerSupabaseClient();
  const { data: orders } = await client
    .from('orders')
    .select('id, customer_name, customer_email, status, total_clp, region, address')
    .order('created_at', { ascending: false });

  const rows = (orders ?? []).map((o: { id: string; customer_name: string; customer_email: string; status: string; total_clp: number; region: string | null; address: string | null }) => ({
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    status: o.status,
    totalClp: o.total_clp,
    region: o.region,
    address: o.address,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Pedidos
      </h1>
      <AdminOrderTable orders={rows} />
    </div>
  );
}
