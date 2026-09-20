import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitPriceClp: number;
  imageUrl: string;
  quantity: number;
  /** Color elegido en la ficha. Ausente = producto de un solo color. */
  variantName?: string;
}

/**
 * Una línea del carrito es un producto EN UN COLOR: el mismo busto en negro y
 * en verde son dos líneas, no una de cantidad 2.
 */
function sameLine(item: CartItem, productId: string, variantName?: string): boolean {
  return item.productId === productId && (item.variantName ?? null) === (variantName ?? null);
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string, variantName?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantName?: string) => void;
  clear: () => void;
  subtotalClp: () => number;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.variantName));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.variantName) ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (productId, variantName) => {
        set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, variantName)) }));
      },
      updateQuantity: (productId, quantity, variantName) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => !sameLine(i, productId, variantName)) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (sameLine(i, productId, variantName) ? { ...i, quantity } : i)),
        }));
      },
      clear: () => set({ items: [] }),
      subtotalClp: () => get().items.reduce((sum, i) => sum + i.unitPriceClp * i.quantity, 0),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    { name: 'madlayerz-cart' }
  )
);
