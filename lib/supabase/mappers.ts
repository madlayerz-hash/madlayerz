import type { Product, ProductVariant } from '@/lib/catalog/types';

export interface ProductVariantRow {
  name: string;
  color_hex: string | null;
  image_url: string | null;
  sort_order: number | null;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_clp: number;
  image_url: string;
  featured: boolean;
  categories: { slug: string; name: string };

  material?: string | null;
  dimensions_mm?: string | null;
  weight_g?: number | null;
  production_days?: string | null;
  care_notes?: string | null;
  images?: string[] | null;
  product_variants?: ProductVariantRow[] | null;
}

/**
 * Los campos nuevos se omiten cuando vienen vacíos en vez de mapearse a null o
 * a un arreglo vacío: así una fila antigua produce exactamente el mismo objeto
 * que antes de la migración 0010.
 */
export function mapRowToProduct(row: ProductRow): Product {
  const product: Product = {
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

  if (row.material) product.material = row.material;
  if (row.dimensions_mm) product.dimensionsMm = row.dimensions_mm;
  if (typeof row.weight_g === 'number') product.weightG = row.weight_g;
  if (row.production_days) product.productionDays = row.production_days;
  if (row.care_notes) product.careNotes = row.care_notes;
  if (row.images?.length) product.images = row.images;

  if (row.product_variants?.length) {
    product.variants = [...row.product_variants]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((variant): ProductVariant => ({
        name: variant.name,
        ...(variant.color_hex ? { colorHex: variant.color_hex } : {}),
        ...(variant.image_url ? { imageUrl: variant.image_url } : {}),
      }));
  }

  return product;
}
