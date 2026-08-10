'use client';

import { useRouter } from 'next/navigation';

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
}

export function AdminCategoryTable({ categories, onChange }: { categories: CategoryRow[]; onChange: () => void }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const response = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json();
      alert(body.error ?? 'No se pudo eliminar la categoría.');
      return;
    }
    onChange();
    router.refresh();
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="pb-2">Nombre</th>
          <th className="pb-2">Slug</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {categories.map((cat) => (
          <tr key={cat.id} className="border-t border-white/10">
            <td className="py-2">{cat.name}</td>
            <td className="py-2">{cat.slug}</td>
            <td className="py-2 text-right">
              <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-500">
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
