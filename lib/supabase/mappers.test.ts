import { describe, it, expect } from 'vitest';
import { mapRowToProduct } from './mappers';

describe('mapRowToProduct', () => {
  it('maps a raw Supabase row (with joined category) into a Product', () => {
    const row = {
      id: '1',
      slug: 'llavero-baby',
      name: 'Llavero Baby Yoda',
      description: 'Llavero divertido',
      price_clp: 3990,
      image_url: '/img/1.jpg',
      featured: true,
      categories: { slug: 'llaveros', name: 'Llaveros' },
    };

    expect(mapRowToProduct(row)).toEqual({
      id: '1',
      slug: 'llavero-baby',
      name: 'Llavero Baby Yoda',
      description: 'Llavero divertido',
      priceClp: 3990,
      imageUrl: '/img/1.jpg',
      featured: true,
      categorySlug: 'llaveros',
      categoryName: 'Llaveros',
    });
  });
});
