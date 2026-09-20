'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminProductForm, type EditableProduct } from './AdminProductForm';
import { AdminProductTable } from './AdminProductTable';

interface CategoryOption {
  id: string;
  name: string;
}

export function AdminProductsManager({
  products,
  categories,
}: {
  products: EditableProduct[];
  categories: CategoryOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const editing = products.find((p) => p.id === editingId) ?? null;

  useEffect(() => {
    if (editingId) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editingId]);

  return (
    <>
      <AdminProductTable products={products} onEdit={setEditingId} />
      <div ref={formRef} className="mt-6">
        <AdminProductForm
          // Remount on selection change so the fields reload with that product.
          key={editing?.id ?? 'nuevo'}
          categories={categories}
          product={editing}
          onSaved={() => setEditingId(null)}
          onCancel={() => setEditingId(null)}
        />
      </div>
    </>
  );
}
