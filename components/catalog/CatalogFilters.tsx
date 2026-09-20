'use client';

import { useState } from 'react';
import type { ProductFilters } from '@/lib/catalog/types';

export interface CategoryOption {
  slug: string;
  name: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { slug: '', name: 'Todas' },
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export function CatalogFilters({
  onFilterChange,
  categories,
  initialCategory = '',
}: {
  onFilterChange: (filters: ProductFilters) => void;
  /** Comes from the database so a category created in the admin shows up here. */
  categories?: CategoryOption[];
  /** Preselected from the ?category= query parameter. */
  initialCategory?: string;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);

  const options = categories?.length ? [{ slug: '', name: 'Todas' }, ...categories] : DEFAULT_CATEGORIES;

  function emit(nextSearch: string, nextCategory: string) {
    onFilterChange({
      search: nextSearch || undefined,
      category: nextCategory || undefined,
    });
  }

  return (
    <div className="glass-surface mb-6 flex flex-wrap items-end gap-4 rounded-2xl p-4">
      <div className="flex-1 basis-48">
        <label htmlFor="buscar">Buscar</label>
        <input
          id="buscar"
          type="search"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            emit(e.target.value, category);
          }}
          className="w-full rounded-full bg-transparent px-4 py-2 outline-none"
        />
      </div>
      <div>
        <label htmlFor="categoria">Categoría</label>
        <select
          id="categoria"
          aria-label="Categoría"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            emit(search, e.target.value);
          }}
          className="w-full rounded-full bg-transparent px-3 py-2"
        >
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
