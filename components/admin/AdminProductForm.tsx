'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { productAdminSchema } from '@/lib/validation/product-admin-schema';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser-client';
import { uploadProductImage } from '@/lib/supabase/storage';

interface CategoryOption {
  id: string;
  name: string;
}

export function AdminProductForm({ categories, onSaved }: { categories: CategoryOption[]; onSaved?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceClp: '',
    categoryId: categories[0]?.id ?? '',
    featured: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = productAdminSchema.safeParse({
      name: form.name,
      description: form.description,
      priceClp: Number(form.priceClp.replace(/[.,\s]/g, '')),
      categoryId: form.categoryId,
      featured: form.featured,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    let imageUrl: string | undefined;
    if (file) {
      const client = createBrowserSupabaseClient();
      imageUrl = await uploadProductImage(client, file);
    }

    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result.data, imageUrl }),
    });

    setSubmitting(false);
    setForm({ name: '', description: '', priceClp: '', categoryId: categories[0]?.id ?? '', featured: false });
    setFile(null);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">Nuevo producto</h3>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="description">Descripción</label>
        <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-2xl bg-transparent px-4 py-2" />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="priceClp">Precio (CLP)</label>
        <input id="priceClp" type="text" inputMode="numeric" placeholder="10000 o 10.000" value={form.priceClp} onChange={(e) => setForm({ ...form, priceClp: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.priceClp && <p className="text-sm text-red-500">{errors.priceClp}</p>}
      </div>
      <div>
        <label htmlFor="categoryId">Categoría</label>
        <select id="categoryId" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-full bg-transparent px-3 py-2">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
      </div>
      <div>
        <label htmlFor="image">Imagen</label>
        <input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        Destacado
      </label>
      <button type="submit" disabled={submitting} className="rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50">
        {submitting ? 'Guardando...' : 'Crear producto'}
      </button>
    </form>
  );
}
