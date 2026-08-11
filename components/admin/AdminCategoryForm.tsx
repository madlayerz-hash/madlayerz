'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryAdminSchema } from '@/lib/validation/category-admin-schema';

export function AdminCategoryForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ slug: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = categoryAdminSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    setForm({ slug: '', name: '' });
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nueva categoría</h3>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="slug">Slug (sin espacios, minúsculas)</label>
        <input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Crear categoría
      </button>
    </form>
  );
}
