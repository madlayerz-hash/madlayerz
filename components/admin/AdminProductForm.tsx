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

export interface EditableProduct {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price_clp: number;
  category_id: string;
  featured: boolean;
}

export function AdminProductForm({
  categories,
  product,
  onSaved,
  onCancel,
}: {
  categories: CategoryOption[];
  /** When present the form updates this product instead of creating a new one. */
  product?: EditableProduct | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(product);

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    priceClp: product ? String(product.price_clp) : '',
    categoryId: product?.category_id ?? categories[0]?.id ?? '',
    featured: product?.featured ?? false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setForm({ name: '', description: '', priceClp: '', categoryId: categories[0]?.id ?? '', featured: false });
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const result = productAdminSchema.safeParse({
      name: form.name,
      description: form.description,
      // Accepts Chilean formatting: "10.000" and "10000" both mean 10000.
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

    try {
      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await uploadProductImage(createBrowserSupabaseClient(), file);
      }

      const response = await fetch('/api/admin/products', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result.data, imageUrl, id: product?.id, slug: product?.slug }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setServerError(payload.error ?? 'No pudimos guardar el producto.');
        return;
      }

      if (!isEditing) reset();
      onSaved?.();
      router.refresh();
    } catch {
      setServerError('No pudimos guardar el producto. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h3 className="font-bold">{isEditing ? `Editar: ${product?.name}` : 'Nuevo producto'}</h3>

      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="description">Descripción</label>
        <textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-2xl bg-transparent px-4 py-2" />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>

      <div>
        <label htmlFor="priceClp">Precio (CLP)</label>
        <input id="priceClp" type="text" inputMode="numeric" placeholder="10000 o 10.000" value={form.priceClp} onChange={(e) => setForm({ ...form, priceClp: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.priceClp && <p className="text-sm text-red-500">{errors.priceClp}</p>}
      </div>

      <div>
        <label htmlFor="categoryId">Categoría</label>
        <select id="categoryId" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-full bg-transparent px-3 py-2">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
      </div>

      <div>
        <label htmlFor="image">Imagen</label>
        <input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full" />
        {isEditing && <p className="text-xs opacity-70">Si no eliges una imagen nueva, se mantiene la actual.</p>}
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        Destacado en la portada
      </label>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50">
          {submitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} className="rounded-full border border-current px-6 py-3 font-semibold">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
