import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { AdminCategoryForm } from '@/components/admin/AdminCategoryForm';
import { AdminCategoryTable } from '@/components/admin/AdminCategoryTable';

export default async function AdminCategoriasPage() {
  const client = await createServerSupabaseClient();
  const { data: categories } = await client.from('categories').select('id, slug, name').order('name');

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Categorías
      </h1>
      <AdminCategoryTable categories={categories ?? []} onChange={() => {}} />
      <div className="mt-6">
        <AdminCategoryForm onSaved={() => {}} />
      </div>
    </div>
  );
}
