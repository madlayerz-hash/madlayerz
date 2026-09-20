export interface ProductVariant {
  /** Nombre visible del color, p. ej. "Verde". */
  name: string;
  /** Hex para el punto de color del selector. */
  colorHex?: string;
  /** Foto de este color; si falta se usa la imagen principal. */
  imageUrl?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceClp: number;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  featured: boolean;

  // Ficha técnica — opcional para no romper productos antiguos.
  material?: string;
  dimensionsMm?: string;
  weightG?: number;
  productionDays?: string;
  careNotes?: string;

  /** Fotos adicionales, sin incluir imageUrl. */
  images?: string[];
  /** Colores disponibles. Vacío o ausente = producto de un solo color. */
  variants?: ProductVariant[];
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
