'use client';

import { useState } from 'react';
import { shippingInfoSchema, type ShippingInfoInput } from '@/lib/validation/checkout-schema';

export function ShippingStep({ onContinue }: { onContinue: (data: ShippingInfoInput) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = shippingInfoSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onContinue(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Datos de contacto</h2>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Continuar
      </button>
    </form>
  );
}
