'use client';

import { useState } from 'react';
import { quoteRequestSchema } from '@/lib/validation/quote-schema';

const initialForm = { name: '', email: '', phone: '', description: '', quantity: '', budgetClp: '' };

export function QuoteForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = quoteRequestSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      description: form.description,
      quantity: Number(form.quantity),
      budgetClp: form.budgetClp ? Number(form.budgetClp) : undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    setSubmitted(true);
    setForm(initialForm);
  }

  if (submitted) {
    return <p className="glass-card p-6 text-center">¡Listo! Te contactaremos pronto con tu cotización.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
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
      <div>
        <label htmlFor="description">Descripción del proyecto</label>
        <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-2xl bg-transparent px-4 py-2" />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="quantity">Cantidad</label>
        <input id="quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
      </div>
      <div>
        <label htmlFor="budgetClp">Presupuesto estimado (opcional)</label>
        <input id="budgetClp" type="number" value={form.budgetClp} onChange={(e) => setForm({ ...form, budgetClp: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Enviar solicitud
      </button>
    </form>
  );
}
