import { describe, it, expect } from 'vitest';
import { productAdminSchema } from './product-admin-schema';

describe('productAdminSchema', () => {
  it('accepts a valid product', () => {
    const result = productAdminSchema.safeParse({
      name: 'Llavero Nuevo',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 4990,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a price of 0 or less', () => {
    const result = productAdminSchema.safeParse({
      name: 'Llavero Nuevo',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 0,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too short', () => {
    const result = productAdminSchema.safeParse({
      name: 'A',
      description: 'Un llavero recién agregado desde el panel admin.',
      priceClp: 4990,
      categoryId: 'cat-1',
      featured: false,
    });
    expect(result.success).toBe(false);
  });
});
