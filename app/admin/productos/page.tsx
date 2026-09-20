import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminProductsManager } from '@/components/admin/AdminProductsManager';
import type { EditableProduct } from '@/components/admin/AdminProductForm';

export const dynamic = 'force-dynamic';

export default async function AdminProductosPage() {
  const client = await createServerSupabaseClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    // description / category_id / slug are needed so a row can be edited in place.
    client.from('products').select('id, slug, name, description, price_clp, category_id, featured').order('name'),
    client.from('categories').select('id, name').order('name'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Productos
      </h1>
      <AdminProductsManager
        products={(products ?? []) as EditableProduct[]}
        categories={categories ?? []}
      />
    </div>
  );
}
