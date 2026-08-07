import type { Product } from '@/lib/catalog/types';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_clp: number;
  image_url: string;
  featured: boolean;
  categories: { slug: string; name: string };
}

export function mapRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceClp: row.price_clp,
    imageUrl: row.image_url,
    featured: row.featured,
    categorySlug: row.categories.slug,
    categoryName: row.categories.name,
  };
}
