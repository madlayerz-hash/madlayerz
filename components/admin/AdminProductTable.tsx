'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatClp } from '@/lib/site';

interface ProductRow {
  id: string;
  name: string;
  price_clp: number;
  featured: boolean;
}

export function AdminProductTable({
  products,
  onEdit,
  onChange,
}: {
  products: ProductRow[];
  onEdit?: (id: string) => void;
  onChange?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState('');

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;

    setError('');
    const response = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'No pudimos eliminar el producto.');
      return;
    }

    onChange?.();
    router.refresh();
  }

  if (products.length === 0) {
    return <p className="opacity-70">Todavía no hay productos. Crea el primero con el formulario de abajo.</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
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
                <td className="py-2">{formatClp(p.price_clp)}</td>
                <td className="py-2">{p.featured ? 'Sí' : 'No'}</td>
                <td className="py-2 text-right">
                  {onEdit && (
                    <button onClick={() => onEdit(p.id)} className="mr-3 text-sm font-semibold">
                      Editar
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)} className="text-sm text-red-500">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
