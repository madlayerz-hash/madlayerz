export interface RequestedItem {
  productId: string;
  quantity: number;
  /** Color elegido en la ficha, si el producto tiene variantes. */
  variantName?: string;
}

export interface CatalogEntry {
  name: string;
  priceClp: number;
  /** Colores válidos según la base de datos. Vacío = producto de un solo color. */
  variantNames?: string[];
}

export interface PricedItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceClp: number;
  variantName?: string;
}

export interface PricedOrder {
  items: PricedItem[];
  subtotalClp: number;
}

export class UnknownProductError extends Error {
  constructor(public readonly productId: string) {
    super(`Producto no disponible: ${productId}`);
    this.name = 'UnknownProductError';
  }
}

export class UnknownVariantError extends Error {
  constructor(public readonly productId: string, public readonly variantName: string) {
    super(`Color no disponible para ${productId}: ${variantName}`);
    this.name = 'UnknownVariantError';
  }
}

/**
 * Rebuilds the order from prices the database actually holds, so nothing the
 * browser claims about money is trusted. Two lines of the same product in
 * distinct colours stay separate; the same product and colour are merged.
 */
export function priceOrder(requested: RequestedItem[], catalog: Map<string, CatalogEntry>): PricedOrder {
  const merged = new Map<string, { productId: string; variantName?: string; quantity: number }>();

  for (const item of requested) {
    const key = `${item.productId}::${item.variantName ?? ''}`;
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { productId: item.productId, variantName: item.variantName, quantity: item.quantity });
    }
  }

  const items: PricedItem[] = [];

  // Array.from: el proyecto compila a ES5 (sin `target` en tsconfig) y ahí
  // un iterador de Map no se puede recorrer directo con for...of.
  for (const line of Array.from(merged.values())) {
    const entry = catalog.get(line.productId);
    if (!entry) throw new UnknownProductError(line.productId);

    // A colour the catalog doesn't offer must not reach the order.
    if (line.variantName && !(entry.variantNames ?? []).includes(line.variantName)) {
      throw new UnknownVariantError(line.productId, line.variantName);
    }

    items.push({
      productId: line.productId,
      name: entry.name,
      quantity: line.quantity,
      unitPriceClp: entry.priceClp,
      ...(line.variantName ? { variantName: line.variantName } : {}),
    });
  }

  const subtotalClp = items.reduce((sum, item) => sum + item.unitPriceClp * item.quantity, 0);

  return { items, subtotalClp };
}
