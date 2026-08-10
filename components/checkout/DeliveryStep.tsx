'use client';

import { useState } from 'react';
import { calculateShippingCost, type Region } from '@/lib/shipping/shipping-cost';
import type { DeliveryInput } from '@/lib/validation/checkout-schema';
import type { Address } from '@/lib/supabase/queries';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'metropolitana', label: 'Región Metropolitana' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'Araucanía' },
  { value: 'los-lagos', label: 'Los Lagos' },
  { value: 'otra', label: 'Otra región' },
];

export function DeliveryStep({
  onContinue,
  savedAddresses = [],
}: {
  onContinue: (data: DeliveryInput, cost: number) => void;
  savedAddresses?: Address[];
}) {
  const [method, setMethod] = useState<'domicilio' | 'retiro'>('domicilio');
  const [region, setRegion] = useState<Region>('metropolitana');
  const [address, setAddress] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(savedAddresses.length === 0);

  const cost = method === 'retiro' ? 0 : calculateShippingCost('domicilio', region);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === 'retiro') {
      onContinue({ method: 'retiro' }, 0);
    } else {
      onContinue({ method: 'domicilio', region, address }, cost);
    }
  }

  function useSavedAddress(saved: Address) {
    const savedCost = calculateShippingCost('domicilio', saved.region as Region);
    onContinue({ method: 'domicilio', region: saved.region as Region, address: saved.address }, savedCost);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de entrega</h2>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'domicilio'}
          onChange={() => setMethod('domicilio')}
        />
        Despacho a domicilio
      </label>

      {method === 'domicilio' && !useManualEntry && savedAddresses.length > 0 && (
        <div className="flex flex-col gap-3 pl-6">
          {savedAddresses.map((saved) => (
            <div key={saved.id} className="glass-surface flex items-center justify-between rounded-xl p-3">
              <div>
                <p className="font-semibold">{saved.label}</p>
                <p className="text-sm opacity-80">{saved.address}</p>
              </div>
              <button type="button" onClick={() => useSavedAddress(saved)} className="rounded-full bg-brand px-3 py-1 text-sm text-white">
                Usar esta dirección
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setUseManualEntry(true)} className="text-left text-sm underline">
            Usar otra dirección
          </button>
        </div>
      )}

      {method === 'domicilio' && useManualEntry && (
        <div className="flex flex-col gap-3 pl-6">
          <label htmlFor="region">Región</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className="rounded-full bg-transparent px-3 py-2">
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <label htmlFor="address">Dirección</label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-full bg-transparent px-4 py-2" />
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'retiro'}
          onChange={() => setMethod('retiro')}
        />
        Retiro en punto físico
      </label>

      <p className="font-bold">Costo de envío: <span>${cost.toLocaleString('es-CL')}</span></p>

      {(method === 'retiro' || useManualEntry) && (
        <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
          Continuar
        </button>
      )}
    </form>
  );
}
