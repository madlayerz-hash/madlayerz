'use client';

import { useState } from 'react';
import type { ProductFilters } from '@/lib/catalog/types';

const CATEGORIES = [
  { slug: '', name: 'Todas' },
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export function CatalogFilters({ onFilterChange }: { onFilterChange: (filters: ProductFilters) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  function emit(nextSearch: string, nextCategory: string) {
    onFilterChange({
      search: nextSearch || undefined,
      category: nextCategory || undefined,
    });
  }

  return (
    <div className="glass-surface mb-6 flex flex-wrap gap-4 rounded-2xl p-4">
      <input
        placeholder="Buscar productos..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          emit(e.target.value, category);
        }}
        className="flex-1 rounded-full bg-transparent px-4 py-2 outline-none"
      />
      <label className="flex items-center gap-2">
        Categoría
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            emit(search, e.target.value);
          }}
          className="rounded-full bg-transparent px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
