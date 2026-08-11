import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { AdminProductTable } from '@/components/admin/AdminProductTable';

export default async function AdminProductosPage() {
  const client = await createServerSupabaseClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    client.from('products').select('id, name, price_clp, featured').order('name'),
    client.from('categories').select('id, name').order('name'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Productos
      </h1>
      <AdminProductTable products={products ?? []} />
      <div className="mt-6">
        <AdminProductForm categories={categories ?? []} />
      </div>
    </div>
  );
}
