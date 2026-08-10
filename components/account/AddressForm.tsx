'use client';

import { useState } from 'react';
import { addressSchema } from '@/lib/validation/address-schema';

const REGIONS = [
  { value: 'metropolitana', label: 'Región Metropolitana' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'Araucanía' },
  { value: 'los-lagos', label: 'Los Lagos' },
  { value: 'otra', label: 'Otra región' },
];

export function AddressForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ label: '', region: 'metropolitana', address: '', isDefault: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = addressSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const response = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      setErrors({ form: 'No se pudo guardar la dirección. Intenta nuevamente.' });
      return;
    }

    setForm({ label: '', region: 'metropolitana', address: '', isDefault: false });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nueva dirección</h3>
      {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}
      <div>
        <label htmlFor="label">Nombre de la dirección</label>
        <input id="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.label && <p className="text-sm text-red-500">{errors.label}</p>}
      </div>
      <div>
        <label htmlFor="region">Región</label>
        <select id="region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="rounded-full bg-transparent px-3 py-2">
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="address">Dirección</label>
        <input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
        Usar como predeterminada
      </label>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Guardar dirección
      </button>
    </form>
  );
}
