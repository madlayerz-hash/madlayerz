'use client';

import { useRouter } from 'next/navigation';

interface ProductRow {
  id: string;
  name: string;
  price_clp: number;
  featured: boolean;
}

export function AdminProductTable({ products, onChange }: { products: ProductRow[]; onChange?: () => void }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
    onChange?.();
    router.refresh();
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="pb-2">Nombre</th>
          <th className="pb-2">Precio</th>
          <th className="pb-2">Destacado</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} className="border-t border-white/10">
            <td className="py-2">{p.name}</td>
            <td className="py-2">${p.price_clp.toLocaleString('es-CL')}</td>
            <td className="py-2">{p.featured ? 'Sí' : 'No'}</td>
            <td className="py-2 text-right">
              <button onClick={() => handleDelete(p.id)} className="text-sm text-red-500">
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
