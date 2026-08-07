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
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
