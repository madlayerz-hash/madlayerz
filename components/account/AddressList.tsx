'use client';

import type { Address } from '@/lib/supabase/queries';

const REGION_LABELS: Record<string, string> = {
  metropolitana: 'Región Metropolitana',
  valparaiso: 'Valparaíso',
  biobio: 'Biobío',
  araucania: 'Araucanía',
  'los-lagos': 'Los Lagos',
  otra: 'Otra región',
};

export function AddressList({ addresses, onChange }: { addresses: Address[]; onChange: () => void }) {
  async function handleDelete(id: string) {
    await fetch(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
    onChange();
  }

  if (addresses.length === 0) {
    return <p>Aún no tienes direcciones guardadas.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {addresses.map((addr) => (
        <li key={addr.id} className="glass-surface flex items-center justify-between rounded-2xl p-4">
          <div>
            <p className="font-semibold">
              {addr.label} {addr.isDefault && <span className="text-xs opacity-70">(predeterminada)</span>}
            </p>
            <p className="text-sm opacity-80">{REGION_LABELS[addr.region]} — {addr.address}</p>
          </div>
          <button onClick={() => handleDelete(addr.id)} className="text-sm text-red-500">
            Eliminar
          </button>
        </li>
      ))}
    </ul>
  );
}
