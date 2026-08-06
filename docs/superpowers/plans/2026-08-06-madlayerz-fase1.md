# MadLayerz Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Fase 1 MadLayerz storefront — catalog, product pages, cart, simulated checkout, custom-quote form, light/dark theming, and animations — as a Next.js app ready to deploy on Vercel.

**Architecture:** Next.js (App Router) + TypeScript site with Tailwind CSS for styling and Framer Motion for animation. Domain logic (cart math, shipping cost, catalog filtering, form validation) lives in plain, dependency-free TypeScript modules under `lib/` so it can be unit-tested with Vitest without a browser or network. Supabase (Postgres + Storage) is the persistence layer for products, orders, and quote requests; all Supabase access goes through a thin query layer in `lib/supabase/` so the rest of the app never imports `@supabase/supabase-js` directly.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS 3.4, Framer Motion 11, Zustand 4 (cart state), Zod 3 (validation), next-themes 0.3 (dark mode), @supabase/supabase-js 2, Vitest 1 + @testing-library/react (tests), Resend (quote-request email notification).

## Global Constraints

- Language of all UI copy: Spanish (Chile).
- Color palette — light mode: background `#ffffff`, glass surface `rgba(255,255,255,0.55)`, accent `#22c55e`, accent-strong `#16a34a`, heading text `#14532d`.
- Color palette — dark mode: background `#0a0a0a`, glass surface `rgba(255,255,255,0.06)`, glass border `rgba(74,222,128,0.25)`, accent `#4ade80`, body text `#e5ffe9`.
- Visual style: rounded corners, soft shadows, glassmorphism (`backdrop-filter: blur`) — no sharp/flat design.
- No user accounts/login anywhere in Fase 1 — checkout is guest-only.
- Payment is **simulated** in Fase 1: orders are stored with status `pendiente_pago`; no real Flow/Mercado Pago API calls (that is Fase 2, out of scope here).
- No admin panel in Fase 1 (Fase 3) — product data is seeded directly into Supabase via a seed script.
- Shipping cost is a fixed lookup table by region, not a live courier API call.
- Catalog size target: ~14 seed products across 5 categories (Llaveros, Figuras de Personajes, Figuras Decorativas, Maceteros, Juguetes).

---

## File Structure

```
madlayerz/
  app/
    layout.tsx                      # root layout, ThemeProvider, fonts, Header/Footer/CartDrawer
    page.tsx                        # home page
    globals.css                     # CSS variables, glass utilities
    catalogo/page.tsx                # catalog with filters
    producto/[slug]/page.tsx         # product detail
    cotizacion/page.tsx              # quote request form
    checkout/page.tsx                # 3-step checkout
    api/
      quotes/route.ts                # POST -> createQuoteRequest + email notify
      orders/route.ts                # POST -> createOrder (simulated payment)
  components/
    layout/Header.tsx
    layout/Footer.tsx
    layout/ThemeToggle.tsx
    cart/CartDrawer.tsx
    cart/CartItemRow.tsx
    home/Hero.tsx
    home/FeaturedProducts.tsx
    home/CategoryChips.tsx
    home/QuoteBanner.tsx
    catalog/ProductGrid.tsx
    catalog/ProductCard.tsx
    catalog/CatalogFilters.tsx
    product/RelatedProducts.tsx
    checkout/ShippingStep.tsx
    checkout/DeliveryStep.tsx
    checkout/PaymentStep.tsx
    checkout/ConfirmationScreen.tsx
    quote/QuoteForm.tsx
    motion/ScrollReveal.tsx
  lib/
    catalog/types.ts
    catalog/filter-products.ts
    catalog/get-related-products.ts
    shipping/shipping-cost.ts
    cart/cart-store.ts
    validation/quote-schema.ts
    validation/checkout-schema.ts
    supabase/client.ts
    supabase/mappers.ts
    supabase/queries.ts
  supabase/
    migrations/0001_init.sql
    seed.ts
  vitest.config.ts
  vitest.setup.ts
```

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Create: `app/layout.tsx` (minimal placeholder), `app/page.tsx` (minimal placeholder), `app/globals.css` (empty Tailwind directives)
- Test: `lib/sanity.test.ts`

**Interfaces:**
- Produces: a working `npm run dev`, `npm run build`, and `npm test` command that every later task relies on.

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@14 madlayerz --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd madlayerz
```

- [ ] **Step 2: Install remaining dependencies**

```bash
npm install zustand zod framer-motion next-themes @supabase/supabase-js resend
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run"
}
```

- [ ] **Step 4: Write a sanity test**

Create `lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('project scaffold', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run test to verify it fails-then-passes cleanly**

Run: `npm test`
Expected: 1 test file, 1 passed (this confirms the runner itself works — there is no "fails first" step here since it's scaffolding, not a behavior test).

- [ ] **Step 6: Verify dev server boots**

Run: `npm run dev`, open `http://localhost:3000`, confirm the default Next.js page loads with no console errors, then stop the server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Design tokens, theming, and ThemeToggle

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `components/layout/ThemeProvider.tsx`
- Create: `components/layout/ThemeToggle.tsx`
- Test: `components/layout/ThemeToggle.test.tsx`

**Interfaces:**
- Produces: `<ThemeProvider>` (wraps children, must be used in `app/layout.tsx` in Task 9), `<ThemeToggle />` (no props, self-contained), Tailwind color tokens `brand.DEFAULT` / `brand.strong` usable as `bg-brand`, `text-brand-strong`, and CSS classes `.glass-card` / `.glass-surface` for glassmorphism.

- [ ] **Step 1: Extend Tailwind theme**

Modify `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#22c55e',
          strong: '#16a34a',
          soft: '#4ade80',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Add CSS variables and glass utilities**

Modify `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.6);
  --heading: #14532d;
  --text: #1f2937;
  --accent: #22c55e;
}

.dark {
  --bg: #0a0a0a;
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(74, 222, 128, 0.25);
  --heading: #e5ffe9;
  --text: #d1fae5;
  --accent: #4ade80;
}

body {
  background-color: var(--bg);
  color: var(--text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.15);
}

.glass-surface {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
}
```

- [ ] **Step 3: Write the failing test for ThemeToggle**

Create `components/layout/ThemeToggle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('toggles the document theme class when clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /cambiar tema/i });
    const initialIsDark = document.documentElement.classList.contains('dark');

    await user.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(!initialIsDark);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ThemeToggle`
Expected: FAIL — `./ThemeProvider` and `./ThemeToggle` don't exist yet.

- [ ] **Step 3: Implement ThemeProvider**

Create `components/layout/ThemeProvider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 4: Implement ThemeToggle**

Create `components/layout/ThemeToggle.tsx`:

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="glass-surface rounded-full p-2 text-lg transition-transform hover:scale-110"
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ThemeToggle`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, glass utilities, and theme toggle"
```

---

### Task 3: Catalog domain types and pure filtering logic

**Files:**
- Create: `lib/catalog/types.ts`
- Create: `lib/catalog/filter-products.ts`
- Create: `lib/catalog/get-related-products.ts`
- Test: `lib/catalog/filter-products.test.ts`
- Test: `lib/catalog/get-related-products.test.ts`

**Interfaces:**
- Produces: `Product` type, `ProductFilters` type, `filterProducts(products: Product[], filters: ProductFilters): Product[]`, `getRelatedProducts(products: Product[], current: Product, limit?: number): Product[]`. Consumed by Task 11 (catalog page) and Task 12 (product detail page).

- [ ] **Step 1: Define the Product type**

Create `lib/catalog/types.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing test for filterProducts**

Create `lib/catalog/filter-products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterProducts } from './filter-products';
import type { Product } from './types';

const products: Product[] = [
  { id: '1', slug: 'llavero-baby', name: 'Llavero Baby Yoda', description: 'Llavero divertido', priceClp: 3990, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/img/1.jpg', featured: true },
  { id: '2', slug: 'macetero-geo', name: 'Macetero Geométrico', description: 'Macetero moderno para plantas', priceClp: 8500, categorySlug: 'maceteros', categoryName: 'Maceteros', imageUrl: '/img/2.jpg', featured: false },
  { id: '3', slug: 'figura-dragon', name: 'Figura Dragón', description: 'Figura decorativa de dragón', priceClp: 12000, categorySlug: 'figuras-decorativas', categoryName: 'Figuras Decorativas', imageUrl: '/img/3.jpg', featured: true },
];

describe('filterProducts', () => {
  it('returns all products when no filters are given', () => {
    expect(filterProducts(products, {})).toHaveLength(3);
  });

  it('filters by category', () => {
    const result = filterProducts(products, { category: 'maceteros' });
    expect(result).toEqual([products[1]]);
  });

  it('filters by min and max price', () => {
    const result = filterProducts(products, { minPrice: 5000, maxPrice: 10000 });
    expect(result).toEqual([products[1]]);
  });

  it('filters by case-insensitive search across name and description', () => {
    const result = filterProducts(products, { search: 'dragón' });
    expect(result).toEqual([products[2]]);
  });

  it('combines multiple filters', () => {
    const result = filterProducts(products, { category: 'llaveros', search: 'yoda' });
    expect(result).toEqual([products[0]]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- filter-products`
Expected: FAIL — `./filter-products` doesn't exist.

- [ ] **Step 4: Implement filterProducts**

Create `lib/catalog/filter-products.ts`:

```ts
import type { Product, ProductFilters } from './types';

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (filters.category && product.categorySlug !== filters.category) return false;
    if (filters.minPrice !== undefined && product.priceClp < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.priceClp > filters.maxPrice) return false;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(query);
      const matchesDescription = product.description.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) return false;
    }

    return true;
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- filter-products`
Expected: PASS (5 tests)

- [ ] **Step 6: Write the failing test for getRelatedProducts**

Create `lib/catalog/get-related-products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getRelatedProducts } from './get-related-products';
import type { Product } from './types';

const products: Product[] = [
  { id: '1', slug: 'a', name: 'A', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '2', slug: 'b', name: 'B', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '3', slug: 'c', name: 'C', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '', featured: false },
  { id: '4', slug: 'd', name: 'D', description: '', priceClp: 1000, categorySlug: 'maceteros', categoryName: 'Maceteros', imageUrl: '', featured: false },
];

describe('getRelatedProducts', () => {
  it('excludes the current product', () => {
    const result = getRelatedProducts(products, products[0]);
    expect(result.some((p) => p.id === products[0].id)).toBe(false);
  });

  it('only includes products from the same category', () => {
    const result = getRelatedProducts(products, products[0]);
    expect(result.every((p) => p.categorySlug === 'llaveros')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const result = getRelatedProducts(products, products[0], 1);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- get-related-products`
Expected: FAIL — `./get-related-products` doesn't exist.

- [ ] **Step 8: Implement getRelatedProducts**

Create `lib/catalog/get-related-products.ts`:

```ts
import type { Product } from './types';

export function getRelatedProducts(products: Product[], current: Product, limit = 4): Product[] {
  return products
    .filter((product) => product.id !== current.id && product.categorySlug === current.categorySlug)
    .slice(0, limit);
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- get-related-products`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add catalog domain types and pure filtering logic"
```

---

### Task 4: Shipping cost calculation

**Files:**
- Create: `lib/shipping/shipping-cost.ts`
- Test: `lib/shipping/shipping-cost.test.ts`

**Interfaces:**
- Produces: `Region` type (`'metropolitana' | 'valparaiso' | 'biobio' | 'araucania' | 'los-lagos' | 'otra'`), `DeliveryMethod` type (`'domicilio' | 'retiro'`), `calculateShippingCost(method: DeliveryMethod, region?: Region): number`. Consumed by Task 13 (checkout DeliveryStep).

- [ ] **Step 1: Write the failing test**

Create `lib/shipping/shipping-cost.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateShippingCost } from './shipping-cost';

describe('calculateShippingCost', () => {
  it('returns 0 for pickup regardless of region', () => {
    expect(calculateShippingCost('retiro')).toBe(0);
  });

  it('returns the fixed cost for a known region', () => {
    expect(calculateShippingCost('domicilio', 'metropolitana')).toBe(3500);
    expect(calculateShippingCost('domicilio', 'los-lagos')).toBe(6500);
  });

  it('throws when domicilio is chosen without a region', () => {
    expect(() => calculateShippingCost('domicilio')).toThrow('region is required for domicilio delivery');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- shipping-cost`
Expected: FAIL — `./shipping-cost` doesn't exist.

- [ ] **Step 3: Implement calculateShippingCost**

Create `lib/shipping/shipping-cost.ts`:

```ts
export type Region = 'metropolitana' | 'valparaiso' | 'biobio' | 'araucania' | 'los-lagos' | 'otra';
export type DeliveryMethod = 'domicilio' | 'retiro';

const REGION_COSTS_CLP: Record<Region, number> = {
  metropolitana: 3500,
  valparaiso: 4500,
  biobio: 5500,
  araucania: 5500,
  'los-lagos': 6500,
  otra: 7500,
};

export function calculateShippingCost(method: DeliveryMethod, region?: Region): number {
  if (method === 'retiro') return 0;
  if (!region) throw new Error('region is required for domicilio delivery');
  return REGION_COSTS_CLP[region];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- shipping-cost`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shipping cost calculation"
```

---

### Task 5: Cart store

**Files:**
- Create: `lib/cart/cart-store.ts`
- Test: `lib/cart/cart-store.test.ts`

**Interfaces:**
- Produces: `CartItem` type (`{ productId, slug, name, unitPriceClp, imageUrl, quantity }`), `useCartStore` Zustand hook with `items`, `addItem(item, quantity?)`, `removeItem(productId)`, `updateQuantity(productId, quantity)`, `clear()`, `subtotalClp()`. Consumed by Task 9 (CartDrawer), Task 12 (product detail add-to-cart), Task 13 (checkout).

- [ ] **Step 1: Write the failing test**

Create `lib/cart/cart-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';

const sampleItem = {
  productId: '1',
  slug: 'llavero-baby',
  name: 'Llavero Baby Yoda',
  unitPriceClp: 3990,
  imageUrl: '/img/1.jpg',
};

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('adds a new item with default quantity 1', () => {
    useCartStore.getState().addItem(sampleItem);
    expect(useCartStore.getState().items).toEqual([{ ...sampleItem, quantity: 1 }]);
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().addItem(sampleItem, 2);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('updates quantity directly', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().updateQuantity('1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes the item when quantity is set to 0 or less', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().updateQuantity('1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes an item explicitly', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().removeItem('1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clears all items', () => {
    useCartStore.getState().addItem(sampleItem);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes the subtotal', () => {
    useCartStore.getState().addItem(sampleItem, 2);
    expect(useCartStore.getState().subtotalClp()).toBe(7980);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cart-store`
Expected: FAIL — `./cart-store` doesn't exist.

- [ ] **Step 3: Implement the cart store**

Create `lib/cart/cart-store.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitPriceClp: number;
  imageUrl: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotalClp: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        }));
      },
      clear: () => set({ items: [] }),
      subtotalClp: () => get().items.reduce((sum, i) => sum + i.unitPriceClp * i.quantity, 0),
    }),
    { name: 'madlayerz-cart' }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cart-store`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add cart store"
```

---

### Task 6: Validation schemas

**Files:**
- Create: `lib/validation/quote-schema.ts`
- Create: `lib/validation/checkout-schema.ts`
- Test: `lib/validation/quote-schema.test.ts`
- Test: `lib/validation/checkout-schema.test.ts`

**Interfaces:**
- Produces: `quoteRequestSchema` (Zod), `QuoteRequestInput` type; `shippingInfoSchema`, `deliverySchema`, `paymentMethodSchema` (Zod). Consumed by Task 13 (checkout steps) and Task 14 (quote form).

- [ ] **Step 1: Write the failing test for the quote schema**

Create `lib/validation/quote-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { quoteRequestSchema } from './quote-schema';

describe('quoteRequestSchema', () => {
  it('accepts a valid quote request', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'not-an-email',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a quantity of zero or less', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('treats budgetClp as optional', () => {
    const result = quoteRequestSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
      description: 'Quiero un set de 10 llaveros con el logo de mi empresa',
      quantity: 10,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- quote-schema`
Expected: FAIL — `./quote-schema` doesn't exist.

- [ ] **Step 3: Implement the quote schema**

Create `lib/validation/quote-schema.ts`:

```ts
import { z } from 'zod';

export const quoteRequestSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  description: z.string().min(10, 'Cuéntanos un poco más sobre tu proyecto'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  budgetClp: z.number().int().nonnegative().optional(),
  referenceImageUrl: z.string().url().optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- quote-schema`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing test for the checkout schema**

Create `lib/validation/checkout-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shippingInfoSchema, deliverySchema, paymentMethodSchema } from './checkout-schema';

describe('shippingInfoSchema', () => {
  it('accepts valid contact info', () => {
    const result = shippingInfoSchema.safeParse({
      name: 'Pablo Toro',
      email: 'pablo@example.com',
      phone: '+56912345678',
    });
    expect(result.success).toBe(true);
  });
});

describe('deliverySchema', () => {
  it('accepts retiro without address fields', () => {
    const result = deliverySchema.safeParse({ method: 'retiro' });
    expect(result.success).toBe(true);
  });

  it('requires region and address for domicilio', () => {
    const result = deliverySchema.safeParse({ method: 'domicilio' });
    expect(result.success).toBe(false);
  });

  it('accepts domicilio with region and address', () => {
    const result = deliverySchema.safeParse({
      method: 'domicilio',
      region: 'metropolitana',
      address: 'Av. Siempre Viva 123',
    });
    expect(result.success).toBe(true);
  });
});

describe('paymentMethodSchema', () => {
  it('accepts flow and mercadopago only', () => {
    expect(paymentMethodSchema.safeParse('flow').success).toBe(true);
    expect(paymentMethodSchema.safeParse('mercadopago').success).toBe(true);
    expect(paymentMethodSchema.safeParse('webpay').success).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- checkout-schema`
Expected: FAIL — `./checkout-schema` doesn't exist.

- [ ] **Step 7: Implement the checkout schema**

Create `lib/validation/checkout-schema.ts`:

```ts
import { z } from 'zod';

export const shippingInfoSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
});

export type ShippingInfoInput = z.infer<typeof shippingInfoSchema>;

export const deliverySchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('retiro') }),
  z.object({
    method: z.literal('domicilio'),
    region: z.enum(['metropolitana', 'valparaiso', 'biobio', 'araucania', 'los-lagos', 'otra']),
    address: z.string().min(5, 'La dirección es muy corta'),
  }),
]);

export type DeliveryInput = z.infer<typeof deliverySchema>;

export const paymentMethodSchema = z.enum(['flow', 'mercadopago']);
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- checkout-schema`
Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add quote and checkout validation schemas"
```

---

### Task 7: Supabase schema, client, and mappers

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/mappers.ts`
- Test: `lib/supabase/mappers.test.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces: `createSupabaseClient()`, `mapRowToProduct(row: ProductRow): Product`. Consumed by Task 8 (queries) and Task 8b (seed script).

- [ ] **Step 1: Write the SQL migration**

Create `supabase/migrations/0001_init.sql`:

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  price_clp integer not null check (price_clp >= 0),
  category_id uuid not null references categories(id),
  image_url text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('domicilio', 'retiro')),
  region text,
  address text,
  shipping_cost_clp integer not null default 0,
  payment_method text not null check (payment_method in ('flow', 'mercadopago')),
  status text not null default 'pendiente_pago',
  subtotal_clp integer not null,
  total_clp integer not null
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price_clp integer not null
);

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  description text not null,
  reference_image_url text,
  quantity integer not null,
  budget_clp integer,
  status text not null default 'nueva'
);
```

- [ ] **Step 2: Create the Supabase client factory**

Create `lib/supabase/client.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, anonKey);
}
```

- [ ] **Step 3: Document required env vars**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
QUOTE_NOTIFICATION_EMAIL=
```

- [ ] **Step 4: Write the failing test for the row-to-Product mapper**

Create `lib/supabase/mappers.test.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- mappers`
Expected: FAIL — `./mappers` doesn't exist.

- [ ] **Step 6: Implement the mapper**

Create `lib/supabase/mappers.ts`:

```ts
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
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- mappers`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Supabase schema, client factory, and row mapper"
```

---

### Task 8: Supabase queries and seed script

**Files:**
- Create: `lib/supabase/queries.ts`
- Create: `supabase/seed.ts`

**Interfaces:**
- Consumes: `createSupabaseClient` (Task 7), `mapRowToProduct` (Task 7), `Product` type (Task 3).
- Produces: `fetchProducts(client): Promise<Product[]>`, `fetchProductBySlug(client, slug): Promise<Product | null>`, `createOrder(client, order): Promise<string>` (returns order id), `createQuoteRequest(client, quote): Promise<string>`. Consumed by Task 10 (home), Task 11 (catalog), Task 12 (product detail), Task 13 (checkout API route), Task 14 (quote API route).

> This task has no automated tests — it is a thin wrapper around the Supabase JS client and requires a live project to execute against. Verification is manual: run the seed script against your own Supabase project and confirm rows appear in the dashboard.

- [ ] **Step 1: Implement the query functions**

Create `lib/supabase/queries.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/catalog/types';
import { mapRowToProduct, type ProductRow } from './mappers';

const PRODUCT_SELECT = 'id, slug, name, description, price_clp, image_url, featured, categories ( slug, name )';

export async function fetchProducts(client: SupabaseClient): Promise<Product[]> {
  const { data, error } = await client.from('products').select(PRODUCT_SELECT);
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapRowToProduct);
}

export async function fetchProductBySlug(client: SupabaseClient, slug: string): Promise<Product | null> {
  const { data, error } = await client.from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRowToProduct(data as unknown as ProductRow);
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethod: 'domicilio' | 'retiro';
  region?: string;
  address?: string;
  shippingCostClp: number;
  paymentMethod: 'flow' | 'mercadopago';
  subtotalClp: number;
  items: { productId: string; quantity: number; unitPriceClp: number }[];
}

export async function createOrder(client: SupabaseClient, input: CreateOrderInput): Promise<string> {
  const totalClp = input.subtotalClp + input.shippingCostClp;

  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      delivery_method: input.deliveryMethod,
      region: input.region ?? null,
      address: input.address ?? null,
      shipping_cost_clp: input.shippingCostClp,
      payment_method: input.paymentMethod,
      status: 'pendiente_pago',
      subtotal_clp: input.subtotalClp,
      total_clp: totalClp,
    })
    .select('id')
    .single();

  if (orderError) throw orderError;

  const { error: itemsError } = await client.from('order_items').insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price_clp: item.unitPriceClp,
    }))
  );

  if (itemsError) throw itemsError;

  return order.id as string;
}

export interface CreateQuoteRequestInput {
  name: string;
  email: string;
  phone: string;
  description: string;
  quantity: number;
  budgetClp?: number;
  referenceImageUrl?: string;
}

export async function createQuoteRequest(client: SupabaseClient, input: CreateQuoteRequestInput): Promise<string> {
  const { data, error } = await client
    .from('quote_requests')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      description: input.description,
      quantity: input.quantity,
      budget_clp: input.budgetClp ?? null,
      reference_image_url: input.referenceImageUrl ?? null,
      status: 'nueva',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
```

- [ ] **Step 2: Write the seed script**

Create `supabase/seed.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const client = createClient(url, serviceKey);

const categories = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

const products = [
  { slug: 'llavero-baby-yoda', name: 'Llavero Baby Yoda', description: 'Llavero divertido inspirado en el personaje favorito de todos.', price_clp: 3990, category: 'llaveros', image_url: '/products/llavero-baby-yoda.jpg', featured: true },
  { slug: 'llavero-mario', name: 'Llavero Mario Bros', description: 'Llavero clásico del fontanero más famoso.', price_clp: 3990, category: 'llaveros', image_url: '/products/llavero-mario.jpg', featured: false },
  { slug: 'llavero-pokebola', name: 'Llavero Pokébola', description: 'Llavero con diseño de Pokébola, dos colores.', price_clp: 3490, category: 'llaveros', image_url: '/products/llavero-pokebola.jpg', featured: false },
  { slug: 'figura-goku', name: 'Figura Goku SSJ', description: 'Figura articulada de Goku en modo Super Saiyajin.', price_clp: 15990, category: 'figuras-personajes', image_url: '/products/figura-goku.jpg', featured: true },
  { slug: 'figura-mando', name: 'Figura El Mandaloriano', description: 'Figura detallada del cazarrecompensas.', price_clp: 17990, category: 'figuras-personajes', image_url: '/products/figura-mando.jpg', featured: false },
  { slug: 'figura-link', name: 'Figura Link', description: 'Figura de Link con espada y escudo.', price_clp: 16990, category: 'figuras-personajes', image_url: '/products/figura-link.jpg', featured: false },
  { slug: 'figura-dragon', name: 'Figura Dragón', description: 'Figura decorativa articulada de dragón, se mueve.', price_clp: 12000, category: 'figuras-decorativas', image_url: '/products/figura-dragon.jpg', featured: true },
  { slug: 'figura-buho', name: 'Figura Búho Geométrico', description: 'Figura decorativa de búho estilo low-poly.', price_clp: 9990, category: 'figuras-decorativas', image_url: '/products/figura-buho.jpg', featured: false },
  { slug: 'macetero-geometrico', name: 'Macetero Geométrico', description: 'Macetero moderno de diseño geométrico para plantas pequeñas.', price_clp: 8500, category: 'maceteros', image_url: '/products/macetero-geometrico.jpg', featured: true },
  { slug: 'macetero-gato', name: 'Macetero Gato', description: 'Macetero con forma de gato, ideal para suculentas.', price_clp: 7990, category: 'maceteros', image_url: '/products/macetero-gato.jpg', featured: false },
  { slug: 'macetero-colgante', name: 'Macetero Colgante', description: 'Macetero colgante con cuerda incluida.', price_clp: 9500, category: 'maceteros', image_url: '/products/macetero-colgante.jpg', featured: false },
  { slug: 'juguete-trompo', name: 'Trompo Articulado', description: 'Trompo giratorio impreso en una sola pieza.', price_clp: 4990, category: 'juguetes', image_url: '/products/juguete-trompo.jpg', featured: false },
  { slug: 'juguete-pulpo', name: 'Pulpo Articulado', description: 'Pulpo flexible articulado, muy popular entre niños.', price_clp: 6990, category: 'juguetes', image_url: '/products/juguete-pulpo.jpg', featured: true },
  { slug: 'juguete-dado', name: 'Dado Gigante', description: 'Dado de gran tamaño para juegos de mesa.', price_clp: 5990, category: 'juguetes', image_url: '/products/juguete-dado.jpg', featured: false },
];

async function seed() {
  const { data: insertedCategories, error: categoryError } = await client
    .from('categories')
    .upsert(categories, { onConflict: 'slug' })
    .select('id, slug');

  if (categoryError) throw categoryError;

  const categoryIdBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  const productRows = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    price_clp: p.price_clp,
    category_id: categoryIdBySlug.get(p.category),
    image_url: p.image_url,
    featured: p.featured,
  }));

  const { error: productError } = await client.from('products').upsert(productRows, { onConflict: 'slug' });
  if (productError) throw productError;

  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Manual verification**

1. Create a Supabase project at supabase.com, run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
3. Run: `npx tsx supabase/seed.ts`
4. Expected: console prints `Seeded 5 categories and 14 products.` Confirm rows exist in the Supabase Table Editor.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Supabase queries and product seed script"
```

---

### Task 9: Layout shell — Header, Footer, CartDrawer

**Files:**
- Create: `components/layout/Header.tsx`
- Create: `components/layout/Footer.tsx`
- Create: `components/cart/CartItemRow.tsx`
- Create: `components/cart/CartDrawer.tsx`
- Modify: `app/layout.tsx`
- Test: `components/cart/CartDrawer.test.tsx`

**Interfaces:**
- Consumes: `useCartStore` (Task 5), `ThemeProvider`/`ThemeToggle` (Task 2).
- Produces: `<Header />`, `<Footer />`, `<CartDrawer />` (all self-contained, no props) rendered from `app/layout.tsx`. Consumed by every page task from here on.

- [ ] **Step 1: Write the failing test for the cart drawer**

Create `components/cart/CartDrawer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCartStore } from '@/lib/cart/cart-store';
import { Header } from '@/components/layout/Header';
import { CartDrawer } from '@/components/cart/CartDrawer';

describe('CartDrawer', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('opens when the cart icon in the header is clicked, and shows items', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({
      productId: '1',
      slug: 'llavero-baby',
      name: 'Llavero Baby Yoda',
      unitPriceClp: 3990,
      imageUrl: '/img/1.jpg',
    });

    render(
      <>
        <Header />
        <CartDrawer />
      </>
    );

    await user.click(screen.getByRole('button', { name: /carrito/i }));

    expect(screen.getByText('Llavero Baby Yoda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CartDrawer`
Expected: FAIL — `Header` and `CartDrawer` don't exist.

- [ ] **Step 3: Implement a shared cart-drawer-open store slot**

Add to `lib/cart/cart-store.ts` (extend the existing file — do not overwrite):

```ts
// Add alongside the existing CartState fields:
isDrawerOpen: boolean;
openDrawer: () => void;
closeDrawer: () => void;
```

And in the store body, add:

```ts
isDrawerOpen: false,
openDrawer: () => set({ isDrawerOpen: true }),
closeDrawer: () => set({ isDrawerOpen: false }),
```

- [ ] **Step 4: Implement Header**

Create `components/layout/Header.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart/cart-store';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const openDrawer = useCartStore((state) => state.openDrawer);
  const itemCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <header className="glass-surface sticky top-0 z-40 flex items-center justify-between px-6 py-4">
      <Link href="/" className="text-xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/cotizacion">Cotización</Link>
        <ThemeToggle />
        <button aria-label="Carrito" onClick={openDrawer} className="relative">
          🛒
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-brand px-1.5 text-xs text-white">
              {itemCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
```

- [ ] **Step 5: Implement CartItemRow and CartDrawer**

Create `components/cart/CartItemRow.tsx`:

```tsx
'use client';

import { useCartStore, type CartItem } from '@/lib/cart/cart-store';

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-3">
      <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
      <div className="flex-1">
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm">${item.unitPriceClp.toLocaleString('es-CL')}</p>
        <div className="mt-1 flex items-center gap-2">
          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
          <button onClick={() => removeItem(item.productId)} className="ml-2 text-sm text-red-500">
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `components/cart/CartDrawer.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart/cart-store';
import { CartItemRow } from './CartItemRow';

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeDrawer}>
      <div
        className="glass-card m-4 flex w-full max-w-sm flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tu carrito</h2>
          <button aria-label="Cerrar carrito" onClick={closeDrawer}>✕</button>
        </div>

        {items.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex justify-between font-bold">
                <span>Subtotal</span>
                <span>${subtotalClp.toLocaleString('es-CL')}</span>
              </div>
              <button
                onClick={() => {
                  closeDrawer();
                  router.push('/checkout');
                }}
                className="mt-4 w-full rounded-full bg-brand py-3 font-semibold text-white transition-transform hover:scale-105"
              >
                Ir a pagar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement Footer**

Create `components/layout/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="glass-surface mt-16 px-6 py-8 text-sm">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-bold" style={{ color: 'var(--heading)' }}>MadLayerz</p>
        <p>Impresión 3D hecha con dedicación — Chile</p>
        <div className="flex gap-4">
          <a href="https://wa.me/56900000000" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="https://instagram.com/madlayerz" target="_blank" rel="noreferrer">Instagram</a>
          <a href="mailto:contacto@madlayerz.cl">contacto@madlayerz.cl</a>
        </div>
        <p className="opacity-60">© {new Date().getFullYear()} MadLayerz. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Wire everything into the root layout**

Modify `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

export const metadata: Metadata = {
  title: 'MadLayerz — Impresión 3D',
  description: 'Llaveros, figuras, maceteros y juguetes impresos en 3D en Chile.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Header />
          {children}
          <Footer />
          <CartDrawer />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- CartDrawer`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add header, footer, and cart drawer wired into root layout"
```

---

### Task 10: Home page

**Files:**
- Create: `components/motion/ScrollReveal.tsx`
- Create: `components/home/Hero.tsx`
- Create: `components/home/FeaturedProducts.tsx`
- Create: `components/home/CategoryChips.tsx`
- Create: `components/home/QuoteBanner.tsx`
- Create: `components/catalog/ProductCard.tsx`
- Modify: `app/page.tsx`
- Test: `app/page.test.tsx`

**Interfaces:**
- Consumes: `fetchProducts` (Task 8), `Product` type (Task 3), `useCartStore.addItem` (Task 5).
- Produces: `<ProductCard product={Product} />` (reused by Task 11 catalog grid and Task 12 related products), `<ScrollReveal>{children}</ScrollReveal>` (reused by every later section-heavy page).

- [ ] **Step 1: Implement ScrollReveal**

Create `components/motion/ScrollReveal.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function ScrollReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Implement ProductCard**

Create `components/catalog/ProductCard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 12px 30px rgba(34,197,94,0.25)' }}
      className="glass-card flex flex-col p-4"
    >
      <Link href={`/producto/${product.slug}`}>
        <img src={product.imageUrl} alt={product.name} className="h-40 w-full rounded-xl object-cover" />
        <h3 className="mt-3 font-semibold">{product.name}</h3>
      </Link>
      <p className="mt-1 font-bold" style={{ color: 'var(--accent)' }}>
        ${product.priceClp.toLocaleString('es-CL')}
      </p>
      <button
        onClick={() =>
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            unitPriceClp: product.priceClp,
            imageUrl: product.imageUrl,
          })
        }
        className="mt-3 rounded-full bg-brand py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Agregar al carrito
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 3: Implement Hero**

Create `components/home/Hero.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        initial="hidden"
        animate="visible"
      >
        <motion.rect
          x="20" y="100" width="80" height="6" rx="3" fill="var(--accent)"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6 }}
        />
        <motion.path
          d="M30 90 L30 40 L60 20 L90 40 L90 90"
          stroke="var(--accent)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
      </motion.svg>
      <h1 className="text-3xl font-extrabold" style={{ color: 'var(--heading)' }}>
        MadLayerz
      </h1>
      <p className="max-w-md">
        Llaveros, figuras, maceteros y juguetes impresos en 3D con dedicación. Encuentra tu pieza
        favorita o pide una a medida.
      </p>
      <Link
        href="/catalogo"
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
      >
        Ver catálogo
      </Link>
    </section>
  );
}
```

- [ ] **Step 4: Implement FeaturedProducts, CategoryChips, QuoteBanner**

Create `components/home/FeaturedProducts.tsx`:

```tsx
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

export function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured);

  return (
    <ScrollReveal>
      <section className="px-6 py-12">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
          Destacados
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
```

Create `components/home/CategoryChips.tsx`:

```tsx
import Link from 'next/link';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

const CATEGORIES = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export function CategoryChips() {
  return (
    <ScrollReveal>
      <section className="flex gap-3 overflow-x-auto px-6 py-6">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/catalogo?category=${category.slug}`}
            className="glass-surface whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium"
          >
            {category.name}
          </Link>
        ))}
      </section>
    </ScrollReveal>
  );
}
```

Create `components/home/QuoteBanner.tsx`:

```tsx
import Link from 'next/link';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

export function QuoteBanner() {
  return (
    <ScrollReveal>
      <section className="glass-card mx-6 my-12 flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
          ¿Tienes una idea personalizada?
        </h2>
        <p>Cuéntanos qué necesitas y te enviamos una cotización a medida.</p>
        <Link
          href="/cotizacion"
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
        >
          Pedir cotización
        </Link>
      </section>
    </ScrollReveal>
  );
}
```

- [ ] **Step 5: Write the failing smoke test for the home page**

Create `app/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({}) }));
vi.mock('@/lib/supabase/queries', () => ({
  fetchProducts: vi.fn().mockResolvedValue([
    { id: '1', slug: 'a', name: 'Llavero de Prueba', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/x.jpg', featured: true },
  ]),
}));

import Page from './page';

describe('Home page', () => {
  it('renders the hero heading and a featured product', async () => {
    const ui = await Page();
    render(ui as React.ReactElement);

    expect(screen.getByRole('heading', { name: 'MadLayerz' })).toBeInTheDocument();
    expect(screen.getByText('Llavero de Prueba')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- app/page`
Expected: FAIL — `app/page.tsx` still has the scaffold placeholder content.

- [ ] **Step 7: Implement the home page**

Modify `app/page.tsx`:

```tsx
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { Hero } from '@/components/home/Hero';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryChips } from '@/components/home/CategoryChips';
import { QuoteBanner } from '@/components/home/QuoteBanner';

export default async function Page() {
  const products = await fetchProducts(createSupabaseClient());

  return (
    <main>
      <Hero />
      <FeaturedProducts products={products} />
      <CategoryChips />
      <QuoteBanner />
    </main>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- app/page`
Expected: PASS

- [ ] **Step 9: Manual verification**

Run `npm run dev`, open `http://localhost:3000`, confirm: hero animation draws in, featured products render (once seeded data exists), category chips scroll horizontally, quote banner links to `/cotizacion`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: build home page with hero, featured products, categories, and quote banner"
```

---

### Task 11: Catalog page with filters

**Files:**
- Create: `components/catalog/ProductGrid.tsx`
- Create: `components/catalog/CatalogFilters.tsx`
- Create: `app/catalogo/page.tsx`
- Test: `components/catalog/CatalogFilters.test.tsx`

**Interfaces:**
- Consumes: `filterProducts` (Task 3), `fetchProducts` (Task 8), `ProductCard` (Task 10).
- Produces: `<CatalogFilters products={Product[]} onFilterChange={(filters: ProductFilters) => void} />`, `<ProductGrid products={Product[]} />`.

- [ ] **Step 1: Write the failing test for CatalogFilters**

Create `components/catalog/CatalogFilters.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogFilters } from './CatalogFilters';

describe('CatalogFilters', () => {
  it('calls onFilterChange with the search text as the user types', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<CatalogFilters onFilterChange={onFilterChange} />);

    await user.type(screen.getByPlaceholderText('Buscar productos...'), 'llavero');

    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'llavero' }));
  });

  it('calls onFilterChange with the selected category', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(<CatalogFilters onFilterChange={onFilterChange} />);

    await user.selectOptions(screen.getByLabelText('Categoría'), 'maceteros');

    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'maceteros' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CatalogFilters`
Expected: FAIL — `./CatalogFilters` doesn't exist.

- [ ] **Step 3: Implement CatalogFilters**

Create `components/catalog/CatalogFilters.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { ProductFilters } from '@/lib/catalog/types';

const CATEGORIES = [
  { slug: '', name: 'Todas' },
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export function CatalogFilters({ onFilterChange }: { onFilterChange: (filters: ProductFilters) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  function emit(nextSearch: string, nextCategory: string) {
    onFilterChange({
      search: nextSearch || undefined,
      category: nextCategory || undefined,
    });
  }

  return (
    <div className="glass-surface mb-6 flex flex-wrap gap-4 rounded-2xl p-4">
      <input
        placeholder="Buscar productos..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          emit(e.target.value, category);
        }}
        className="flex-1 rounded-full bg-transparent px-4 py-2 outline-none"
      />
      <label className="flex items-center gap-2">
        Categoría
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            emit(search, e.target.value);
          }}
          className="rounded-full bg-transparent px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CatalogFilters`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement ProductGrid**

Create `components/catalog/ProductGrid.tsx`:

```tsx
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="px-6 py-12 text-center">No encontramos productos con esos filtros.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-6 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Implement the catalog page**

Create `app/catalogo/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProducts } from '@/lib/supabase/queries';
import { filterProducts } from '@/lib/catalog/filter-products';
import type { Product, ProductFilters } from '@/lib/catalog/types';
import { CatalogFilters } from '@/components/catalog/CatalogFilters';
import { ProductGrid } from '@/components/catalog/ProductGrid';

export default function CatalogoPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({});

  useEffect(() => {
    fetchProducts(createSupabaseClient()).then(setAllProducts);
  }, []);

  const visibleProducts = filterProducts(allProducts, filters);

  return (
    <main className="px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Catálogo
      </h1>
      <CatalogFilters onFilterChange={setFilters} />
      <ProductGrid products={visibleProducts} />
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open `/catalogo`, confirm typing in search and selecting a category both narrow the grid live.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build catalog page with search and category filters"
```

---

### Task 12: Product detail page

**Files:**
- Create: `components/product/RelatedProducts.tsx`
- Create: `components/product/AddToCartButton.tsx`
- Create: `app/producto/[slug]/page.tsx`
- Test: `components/product/RelatedProducts.test.tsx`

**Interfaces:**
- Consumes: `fetchProductBySlug`, `fetchProducts` (Task 8), `getRelatedProducts` (Task 3), `ProductCard` (Task 10), `useCartStore.addItem` (Task 5).
- Produces: `<RelatedProducts products={Product[]} />`, `<AddToCartButton product={Product} />`.

- [ ] **Step 1: Write the failing test for RelatedProducts**

Create `components/product/RelatedProducts.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedProducts } from './RelatedProducts';
import type { Product } from '@/lib/catalog/types';

const products: Product[] = [
  { id: '1', slug: 'a', name: 'Llavero A', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/a.jpg', featured: false },
  { id: '2', slug: 'b', name: 'Llavero B', description: '', priceClp: 1000, categorySlug: 'llaveros', categoryName: 'Llaveros', imageUrl: '/b.jpg', featured: false },
];

describe('RelatedProducts', () => {
  it('renders a heading and each product name', () => {
    render(<RelatedProducts products={products} />);

    expect(screen.getByRole('heading', { name: 'También te puede gustar' })).toBeInTheDocument();
    expect(screen.getByText('Llavero A')).toBeInTheDocument();
    expect(screen.getByText('Llavero B')).toBeInTheDocument();
  });

  it('renders nothing when there are no related products', () => {
    const { container } = render(<RelatedProducts products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RelatedProducts`
Expected: FAIL — `./RelatedProducts` doesn't exist.

- [ ] **Step 3: Implement RelatedProducts**

Create `components/product/RelatedProducts.tsx`:

```tsx
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="px-6 py-12">
      <h2 className="mb-6 text-xl font-bold" style={{ color: 'var(--heading)' }}>
        También te puede gustar
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RelatedProducts`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement AddToCartButton (a client component so the Server Component product page can still trigger cart mutations)**

Create `components/product/AddToCartButton.tsx`:

```tsx
'use client';

import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';

export function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      onClick={() =>
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          unitPriceClp: product.priceClp,
          imageUrl: product.imageUrl,
        })
      }
      className="mt-4 rounded-full bg-brand px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
    >
      Agregar al carrito
    </button>
  );
}
```

- [ ] **Step 6: Implement the product detail page**

Create `app/producto/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { fetchProductBySlug, fetchProducts } from '@/lib/supabase/queries';
import { getRelatedProducts } from '@/lib/catalog/get-related-products';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { AddToCartButton } from '@/components/product/AddToCartButton';

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const client = createSupabaseClient();
  const product = await fetchProductBySlug(client, params.slug);

  if (!product) notFound();

  const allProducts = await fetchProducts(client);
  const related = getRelatedProducts(allProducts, product);

  return (
    <main className="px-6 py-8">
      <div className="glass-card flex flex-col gap-6 p-6 md:flex-row">
        <img src={product.imageUrl} alt={product.name} className="h-64 w-full rounded-xl object-cover md:w-1/2" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
            {product.name}
          </h1>
          <p className="mt-2 text-xl font-bold" style={{ color: 'var(--accent)' }}>
            ${product.priceClp.toLocaleString('es-CL')}
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
      <p className="mt-6 max-w-2xl">{product.description}</p>
      <RelatedProducts products={related} />
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open `/producto/llavero-baby-yoda` (after seeding), confirm the product loads, "Agregar al carrito" opens/updates the cart badge, and related products from the same category appear below.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build product detail page with related products"
```

---

### Task 13: Checkout flow (3 steps, simulated payment)

**Files:**
- Create: `components/checkout/ShippingStep.tsx`
- Create: `components/checkout/DeliveryStep.tsx`
- Create: `components/checkout/PaymentStep.tsx`
- Create: `components/checkout/ConfirmationScreen.tsx`
- Create: `app/checkout/page.tsx`
- Create: `app/api/orders/route.ts`
- Test: `components/checkout/DeliveryStep.test.tsx`

**Interfaces:**
- Consumes: `shippingInfoSchema`, `deliverySchema`, `paymentMethodSchema` (Task 6), `calculateShippingCost` (Task 4), `useCartStore` (Task 5), `createOrder` (Task 8).
- Produces: `POST /api/orders` accepting `CreateOrderInput`-shaped JSON, returning `{ orderId: string }`.

- [ ] **Step 1: Write the failing test for DeliveryStep**

Create `components/checkout/DeliveryStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryStep } from './DeliveryStep';

describe('DeliveryStep', () => {
  it('shows the shipping cost for the selected region when domicilio is chosen', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(<DeliveryStep onContinue={onContinue} />);

    await user.click(screen.getByLabelText('Despacho a domicilio'));
    await user.selectOptions(screen.getByLabelText('Región'), 'metropolitana');

    expect(screen.getByText('$3.500')).toBeInTheDocument();
  });

  it('shows no shipping cost when retiro is chosen', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();

    render(<DeliveryStep onContinue={onContinue} />);

    await user.click(screen.getByLabelText('Retiro en punto físico'));

    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DeliveryStep`
Expected: FAIL — `./DeliveryStep` doesn't exist.

- [ ] **Step 3: Implement ShippingStep**

Create `components/checkout/ShippingStep.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { shippingInfoSchema, type ShippingInfoInput } from '@/lib/validation/checkout-schema';

export function ShippingStep({ onContinue }: { onContinue: (data: ShippingInfoInput) => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = shippingInfoSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onContinue(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Datos de contacto</h2>
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Continuar
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Implement DeliveryStep**

Create `components/checkout/DeliveryStep.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { calculateShippingCost, type Region } from '@/lib/shipping/shipping-cost';
import type { DeliveryInput } from '@/lib/validation/checkout-schema';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'metropolitana', label: 'Región Metropolitana' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'biobio', label: 'Biobío' },
  { value: 'araucania', label: 'Araucanía' },
  { value: 'los-lagos', label: 'Los Lagos' },
  { value: 'otra', label: 'Otra región' },
];

export function DeliveryStep({ onContinue }: { onContinue: (data: DeliveryInput, cost: number) => void }) {
  const [method, setMethod] = useState<'domicilio' | 'retiro'>('domicilio');
  const [region, setRegion] = useState<Region>('metropolitana');
  const [address, setAddress] = useState('');

  const cost = method === 'retiro' ? 0 : calculateShippingCost('domicilio', region);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === 'retiro') {
      onContinue({ method: 'retiro' }, 0);
    } else {
      onContinue({ method: 'domicilio', region, address }, cost);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de entrega</h2>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'domicilio'}
          onChange={() => setMethod('domicilio')}
        />
        Despacho a domicilio
      </label>

      {method === 'domicilio' && (
        <div className="flex flex-col gap-3 pl-6">
          <label htmlFor="region">Región</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)} className="rounded-full bg-transparent px-3 py-2">
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <label htmlFor="address">Dirección</label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-full bg-transparent px-4 py-2" />
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="delivery"
          checked={method === 'retiro'}
          onChange={() => setMethod('retiro')}
        />
        Retiro en punto físico
      </label>

      <p className="font-bold">Costo de envío: ${cost.toLocaleString('es-CL')}</p>

      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Continuar
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- DeliveryStep`
Expected: PASS (2 tests)

- [ ] **Step 6: Implement PaymentStep**

Create `components/checkout/PaymentStep.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { PaymentMethodInput } from '@/lib/validation/checkout-schema';

export function PaymentStep({ onConfirm }: { onConfirm: (method: PaymentMethodInput) => void }) {
  const [method, setMethod] = useState<PaymentMethodInput>('flow');

  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold">Método de pago</h2>
      <p className="text-sm opacity-80">
        El pago aún no se procesa realmente — tu pedido quedará como "pendiente de pago" y te
        contactaremos para coordinar el cobro.
      </p>

      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={method === 'flow'} onChange={() => setMethod('flow')} />
        Flow
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="payment" checked={method === 'mercadopago'} onChange={() => setMethod('mercadopago')} />
        Mercado Pago
      </label>

      <button onClick={() => onConfirm(method)} className="rounded-full bg-brand py-3 font-semibold text-white">
        Confirmar pedido
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Implement ConfirmationScreen**

Create `components/checkout/ConfirmationScreen.tsx`:

```tsx
export function ConfirmationScreen({ orderId }: { orderId: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
      <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
        ¡Pedido recibido!
      </h2>
      <p>Tu número de pedido es <strong>{orderId}</strong>.</p>
      <p className="max-w-md text-sm opacity-80">
        Te contactaremos por email o WhatsApp para coordinar el pago y la entrega.
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Implement the orders API route**

Create `app/api/orders/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/client';
import { createOrder, type CreateOrderInput } from '@/lib/supabase/queries';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOrderInput;

  try {
    const orderId = await createOrder(createSupabaseClient(), body);
    return NextResponse.json({ orderId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 9: Implement the checkout page composing all steps**

Create `app/checkout/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cart/cart-store';
import type { ShippingInfoInput, DeliveryInput, PaymentMethodInput } from '@/lib/validation/checkout-schema';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { DeliveryStep } from '@/components/checkout/DeliveryStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { ConfirmationScreen } from '@/components/checkout/ConfirmationScreen';

type Step = 'shipping' | 'delivery' | 'payment' | 'done';

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingInfoInput | null>(null);
  const [delivery, setDelivery] = useState<{ data: DeliveryInput; cost: number } | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const items = useCartStore((state) => state.items);
  const subtotalClp = useCartStore((state) => state.subtotalClp());
  const clear = useCartStore((state) => state.clear);

  async function handlePaymentConfirm(paymentMethod: PaymentMethodInput) {
    if (!shipping || !delivery) return;

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: shipping.name,
        customerEmail: shipping.email,
        customerPhone: shipping.phone,
        deliveryMethod: delivery.data.method,
        region: delivery.data.method === 'domicilio' ? delivery.data.region : undefined,
        address: delivery.data.method === 'domicilio' ? delivery.data.address : undefined,
        shippingCostClp: delivery.cost,
        paymentMethod,
        subtotalClp,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceClp: i.unitPriceClp })),
      }),
    });

    const result = await response.json();
    setOrderId(result.orderId);
    clear();
    setStep('done');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Checkout
      </h1>

      {step === 'shipping' && (
        <ShippingStep onContinue={(data) => { setShipping(data); setStep('delivery'); }} />
      )}
      {step === 'delivery' && (
        <DeliveryStep onContinue={(data, cost) => { setDelivery({ data, cost }); setStep('payment'); }} />
      )}
      {step === 'payment' && <PaymentStep onConfirm={handlePaymentConfirm} />}
      {step === 'done' && orderId && <ConfirmationScreen orderId={orderId} />}
    </main>
  );
}
```

- [ ] **Step 10: Manual verification**

With Supabase configured and at least one item in the cart, walk through `/checkout` end to end: fill contact info → pick domicilio + a region (confirm cost shown matches Task 4's table) → pick Flow → confirm → verify a new row appears in the `orders` table with `status = 'pendiente_pago'` and matching `order_items` rows.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: build 3-step checkout with simulated payment"
```

---

### Task 14: Custom quote request page

**Files:**
- Create: `components/quote/QuoteForm.tsx`
- Create: `app/cotizacion/page.tsx`
- Create: `app/api/quotes/route.ts`
- Test: `components/quote/QuoteForm.test.tsx`

**Interfaces:**
- Consumes: `quoteRequestSchema` (Task 6), `createQuoteRequest` (Task 8).
- Produces: `POST /api/quotes` accepting `CreateQuoteRequestInput`-shaped JSON, returning `{ id: string }`.

- [ ] **Step 1: Write the failing test for QuoteForm**

Create `components/quote/QuoteForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteForm } from './QuoteForm';

describe('QuoteForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'quote-1' }) });
  });

  it('shows a validation error when submitting an empty form', async () => {
    const user = userEvent.setup();
    render(<QuoteForm />);

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByText('El nombre es muy corto')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits to /api/quotes and shows a success message when valid', async () => {
    const user = userEvent.setup();
    render(<QuoteForm />);

    await user.type(screen.getByLabelText('Nombre'), 'Pablo Toro');
    await user.type(screen.getByLabelText('Email'), 'pablo@example.com');
    await user.type(screen.getByLabelText('Teléfono'), '+56912345678');
    await user.type(screen.getByLabelText('Descripción del proyecto'), 'Quiero 10 llaveros personalizados con mi logo');
    await user.type(screen.getByLabelText('Cantidad'), '10');

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByText(/¡Listo! Te contactaremos pronto/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/quotes', expect.objectContaining({ method: 'POST' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- QuoteForm`
Expected: FAIL — `./QuoteForm` doesn't exist.

- [ ] **Step 3: Implement QuoteForm**

Create `components/quote/QuoteForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { quoteRequestSchema } from '@/lib/validation/quote-schema';

const initialForm = { name: '', email: '', phone: '', description: '', quantity: '', budgetClp: '' };

export function QuoteForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = quoteRequestSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      description: form.description,
      quantity: Number(form.quantity),
      budgetClp: form.budgetClp ? Number(form.budgetClp) : undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    setSubmitted(true);
    setForm(initialForm);
  }

  if (submitted) {
    return <p className="glass-card p-6 text-center">¡Listo! Te contactaremos pronto con tu cotización.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-4 p-6">
      <div>
        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="description">Descripción del proyecto</label>
        <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-2xl bg-transparent px-4 py-2" />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="quantity">Cantidad</label>
        <input id="quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
        {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
      </div>
      <div>
        <label htmlFor="budgetClp">Presupuesto estimado (opcional)</label>
        <input id="budgetClp" type="number" value={form.budgetClp} onChange={(e) => setForm({ ...form, budgetClp: e.target.value })} className="w-full rounded-full bg-transparent px-4 py-2" />
      </div>
      <button type="submit" className="rounded-full bg-brand py-3 font-semibold text-white">
        Enviar solicitud
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- QuoteForm`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement the quotes API route with email notification**

Create `app/api/quotes/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseClient } from '@/lib/supabase/client';
import { createQuoteRequest, type CreateQuoteRequestInput } from '@/lib/supabase/queries';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateQuoteRequestInput;

  try {
    const id = await createQuoteRequest(createSupabaseClient(), body);

    if (process.env.RESEND_API_KEY && process.env.QUOTE_NOTIFICATION_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'MadLayerz <notificaciones@madlayerz.cl>',
        to: process.env.QUOTE_NOTIFICATION_EMAIL,
        subject: `Nueva cotización de ${body.name}`,
        text: `${body.name} (${body.email}, ${body.phone}) pidió cotización:\n\n${body.description}\n\nCantidad: ${body.quantity}`,
      });
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Implement the quote page**

Create `app/cotizacion/page.tsx`:

```tsx
import { QuoteForm } from '@/components/quote/QuoteForm';

export default function CotizacionPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--heading)' }}>
        Cotización personalizada
      </h1>
      <p className="mb-6">Cuéntanos tu idea y te respondemos con una propuesta hecha a medida.</p>
      <QuoteForm />
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

Set `RESEND_API_KEY` and `QUOTE_NOTIFICATION_EMAIL` in `.env.local` (sign up at resend.com for a free API key), submit the form on `/cotizacion`, confirm a row appears in `quote_requests` and an email notification arrives. If you skip Resend setup for now, confirm the row still saves and the route doesn't error (the email block is skipped gracefully).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build custom quote request form with email notification"
```

---

### Task 15: Deploy to Vercel and connect the domain

**Files:** none (infrastructure/configuration task, no source files)

**Interfaces:** none — this is the final deployment step, consumes the working app from all previous tasks.

- [ ] **Step 1: Push the repository to GitHub**

```bash
gh repo create madlayerz --private --source=. --remote=origin --push
```

(If `gh` isn't authenticated, create the repo manually on github.com and `git remote add origin <url> && git push -u origin master` instead.)

- [ ] **Step 2: Import the project in Vercel**

In the Vercel dashboard: **Add New → Project → Import** the `madlayerz` GitHub repo.

- [ ] **Step 3: Configure environment variables in Vercel**

In **Settings → Environment Variables**, add for Production (and Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `QUOTE_NOTIFICATION_EMAIL` — same values as your local `.env.local`.

- [ ] **Step 4: Deploy and smoke test**

Trigger the deploy, open the generated `*.vercel.app` URL, and manually verify: home page loads with animation, catalog filters work, a product page opens with related products, adding to cart and completing checkout creates an order (check Supabase), the quote form submits successfully, and the light/dark toggle works.

- [ ] **Step 5: Connect the madlayerz.cl domain**

In the Vercel project → **Settings → Domains → Add Existing**, add `madlayerz.cl` and `www.madlayerz.cl`. Vercel will show the DNS records to set — since nameservers already point to Vercel (confirmed earlier), this should activate without further NIC Chile changes; wait a few minutes and reload `madlayerz.cl` to confirm the new site (not the old 404) now loads.

- [ ] **Step 6: Final commit (if any deploy-config files changed)**

```bash
git add -A
git commit -m "chore: finalize Vercel deployment configuration" --allow-empty
git push
```

---

## Self-Review Notes

- **Spec coverage:** catalog/filters (Task 3, 11), shipping cost table (Task 4), cart (Task 5), checkout 3 steps + simulated payment (Task 13), quote form (Task 14), Supabase persistence for products/orders/quotes (Task 7–8), light/dark theme (Task 2), glassmorphism styling (Task 2, applied throughout), animations (Task 10's ScrollReveal/Hero, ProductCard hover, cart badge), deployment + domain reconnection (Task 15). All Fase 1 spec sections are covered.
- **Type consistency checked:** `Product`, `ProductFilters` (Task 3) reused verbatim through Tasks 8, 10, 11, 12. `CartItem`/`useCartStore` (Task 5) reused verbatim through Tasks 9, 10, 12, 13. `ShippingInfoInput`/`DeliveryInput`/`PaymentMethodInput` (Task 6) reused verbatim through Task 13. `CreateOrderInput`/`CreateQuoteRequestInput` (Task 8) match the JSON bodies posted in Tasks 13 and 14.
- **No placeholders:** every step above contains complete, runnable code — no TBD/TODO markers remain.
