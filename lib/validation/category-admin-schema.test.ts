import { describe, it, expect } from 'vitest';
import { categoryAdminSchema } from './category-admin-schema';

describe('categoryAdminSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'llaveros', name: 'Llaveros' }).success).toBe(true);
  });

  it('rejects a slug with spaces or uppercase', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'Mi Categoria', name: 'Mi Categoria' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(categoryAdminSchema.safeParse({ slug: 'llaveros', name: '' }).success).toBe(false);
  });
});
