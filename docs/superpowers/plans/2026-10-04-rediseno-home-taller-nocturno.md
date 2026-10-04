# Rediseño de la home «Taller nocturno» — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer la home de madlayerz.cl con estética oscura de taller 3D, una pieza Three.js que se imprime por capas y paleta nueva aplicada a todo el sitio.

**Architecture:** Tokens de color como variables CSS (`app/globals.css`) expuestas a Tailwind; la home se arma con secciones pequeñas en `components/home/`; las animaciones de scroll usan `framer-motion` mediante un único `LayerReveal`; el 3D vive aislado en `components/home/hero-3d/` (lógica pura testeada + escena Three.js + componente cargado con `next/dynamic` sin SSR) y siempre tiene una imagen estática de respaldo.

**Tech Stack:** Next.js 14.2.35 (App Router), React 18, Tailwind 3, framer-motion 13, three (nuevo), Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-04-rediseno-home-taller-nocturno-design.md`

## Global Constraints

- Rama `rediseno-home`. No tocar checkout, pagos, correo, Supabase ni admin.
- Antes de cerrar cualquier tarea: `npm run build` sin errores (Vercel falla con lint o tipos). `npm test` en verde.
- `tsconfig.json` no define `target` (cae a ES5): no iterar `Map`/`Set` directo; usar `Array.from(...)`.
- `app/page.tsx` mantiene `export const revalidate = 60`.
- Textos de interfaz y comentarios en español de Chile; los comentarios explican *por qué*.
- No inventar testimonios, cifras de clientes ni datos técnicos. Toda afirmación técnica visible vive en `components/home/copy.ts` y Pablo la confirma en la Tarea 9.
- Todo par texto/fondo cumple WCAG AA (≥ 4.5:1 texto normal).
- Con `prefers-reduced-motion: reduce` no hay movimiento: todo aparece estático.
- Sólo se animan `transform`, `opacity` y `clip-path`.
- Chunk del 3D ≤ ~180 KB gzip, cargado después del contenido; el LCP es el título del hero.
- Paleta oscura: fondo `#0b0d0c`, acento `#4ade80`. Modo claro: acento de texto `#15803d`.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `app/globals.css` | Tokens de color (claro/oscuro), clases `.ml-header`, `.ml-marquee__track` |
| `app/design-tokens.test.ts` | Verifica contraste AA de los tokens leyendo `globals.css` |
| `tailwind.config.ts` | Colores que apuntan a los tokens; `font-mono` |
| `app/layout.tsx` | Carga Geist Mono; `themeColor` nuevo |
| `components/layout/ThemeProvider.tsx` | `defaultTheme="dark"` |
| `components/layout/Header.tsx`, `Footer.tsx` | Estilo nuevo, misma navegación |
| `components/motion/LayerReveal.tsx` | Revelado de abajo hacia arriba en saltos |
| `components/catalog/ProductCard.tsx` | Estilo nuevo, mismo comportamiento de carrito |
| `components/home/copy.ts` | Textos y datos técnicos de la home (un solo lugar para confirmar) |
| `components/home/Hero.tsx` | Título, botones y espacio para la pieza |
| `components/home/Marquee.tsx` | Cinta técnica en bucle |
| `components/home/FeaturedBento.tsx` | Destacados en grilla bento (reemplaza `FeaturedProducts.tsx`) |
| `components/home/ProcessSteps.tsx` | «Cómo se hace» |
| `components/home/CategoryTiles.tsx` | Accesos a categorías (reemplaza `CategoryChips.tsx`) |
| `components/home/QuoteCta.tsx` | Cierre de cotización (reemplaza `QuoteBanner.tsx`) |
| `components/home/hero-3d/render-env.ts` | Decide 3D o imagen estática (puro + lector del navegador) |
| `components/home/hero-3d/print-progress.ts` | Altura de corte por capas según el tiempo (puro) |
| `components/home/hero-3d/model.ts` | Geometría de la pieza |
| `components/home/hero-3d/scene.ts` | Escena Three.js: luces, corte, anillo, bucle, limpieza |
| `components/home/hero-3d/PrintCanvas.tsx` | Monta la escena en un `<canvas>` |
| `components/home/hero-3d/HeroPiece.tsx` | Imagen de respaldo + carga diferida del canvas |
| `app/page.tsx` | Orden de las secciones |

---

### Task 1: Tokens de color, tipografía y tema oscuro por defecto

**Files:**
- Modify: `app/globals.css` (bloques `:root` y `.dark`, líneas 5-30; `.glass-card`; agregar clases al final)
- Create: `app/design-tokens.test.ts`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`
- Modify: `components/layout/ThemeProvider.tsx`

**Interfaces:**
- Produces: variables CSS `--bg --surface --surface-2 --line --text --muted --heading --accent --accent-text --on-accent` (se conservan `--glass-bg --glass-border --field-border --logo-glow` para las páginas no rediseñadas). Clases Tailwind `bg-ink bg-surface bg-surface-2 border-line text-muted text-accent-text bg-accent text-on-accent font-mono`.

- [ ] **Step 1: Escribir el test de contraste**

`app/design-tokens.test.ts`:

```ts
import { readFileSync } from 'fs';
import path from 'path';

// Lee los tokens directo del CSS para que el test falle si alguien cambia un
// color sin revisar el contraste.
const css = readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encontró ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  body.replace(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g, (_m, name: string, value: string) => {
    vars[name] = value;
    return '';
  });
  return vars;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['heading', 'bg'],
  ['accent-text', 'bg'],
  ['accent-text', 'surface'],
  ['on-accent', 'accent'],
];

describe.each([':root', '.dark'])('tokens %s', (selector) => {
  const tokens = block(selector);

  it.each(PAIRS)('%s sobre %s cumple AA', (fg, bg) => {
    expect(tokens[fg], `falta --${fg}`).toBeDefined();
    expect(tokens[bg], `falta --${bg}`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Correr el test y ver que falla**

Run: `npx vitest run app/design-tokens.test.ts`
Expected: FAIL con «falta --surface» (y similares).

- [ ] **Step 3: Reemplazar los tokens en `app/globals.css`**

Reemplazar los bloques `:root { … }` y `.dark { … }` (líneas 5-30) por:

```css
:root {
  --bg: #f6f8f6;
  --surface: #ffffff;
  --surface-2: #eef2ef;
  --line: #d6dfd9;
  --text: #17201b;
  --muted: #4b5a51;
  --heading: #0b1a11;
  /* Verde oscuro: el #22c55e del logo no llega a AA con texto blanco encima. */
  --accent: #15803d;
  --accent-text: #15803d;
  --on-accent: #ffffff;
  --glass-bg: #ffffff;
  --glass-border: #d6dfd9;
  --field-border: #c2cdc6;
  --logo-glow: #22c55e;
}

.dark {
  --bg: #0b0d0c;
  --surface: #121614;
  --surface-2: #18201b;
  --line: #24302a;
  --text: #e6efe9;
  --muted: #9fb5a7;
  --heading: #f2fbf5;
  --accent: #4ade80;
  --accent-text: #4ade80;
  --on-accent: #06210f;
  --glass-bg: #121614;
  --glass-border: #24302a;
  --field-border: #2f3d35;
  /* En oscuro el logo ya es verde claro: el brillo tiene que ser casi blanco para notarse. */
  --logo-glow: #eafff0;
}
```

En `.glass-card` (más abajo en el archivo) reemplazar `box-shadow: 0 8px 24px rgba(34, 197, 94, 0.15);` por `box-shadow: none;` para que las páginas no rediseñadas no queden con el halo verde viejo.

Al final del archivo agregar:

```css
/* Header translúcido sobre el fondo del tema, sin depender del glass viejo. */
.ml-header {
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

@keyframes ml-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.ml-marquee__track {
  display: flex;
  width: max-content;
  animation: ml-marquee 40s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ml-marquee__track { animation: none; }
}
```

- [ ] **Step 4: Correr el test y ver que pasa**

Run: `npx vitest run app/design-tokens.test.ts`
Expected: PASS (16 casos). Si algún par no llega a 4.5, ajustar ese color (no el umbral).

- [ ] **Step 5: Tailwind**

`tailwind.config.ts`, reemplazar `fontFamily` y `colors` dentro de `theme.extend`:

```ts
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#22c55e',
          strong: '#16a34a',
          soft: '#4ade80',
        },
        ink: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        line: 'var(--line)',
        muted: 'var(--muted)',
        accent: { DEFAULT: 'var(--accent)', text: 'var(--accent-text)' },
        'on-accent': 'var(--on-accent)',
      },
```

- [ ] **Step 6: Fuente mono y color del navegador en `app/layout.tsx`**

Debajo de `const geist = localFont({...})`:

```ts
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});
```

Cambiar `className={geist.variable}` del `<html>` por ``className={`${geist.variable} ${geistMono.variable}`}``, y `viewport.themeColor` por:

```ts
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d0c' },
  ],
```

- [ ] **Step 7: Oscuro por defecto**

`components/layout/ThemeProvider.tsx`: cambiar `defaultTheme="light"` por `defaultTheme="dark"`.

- [ ] **Step 8: Verificar y commitear**

Run: `npm test` → todo PASS. `npm run build` → sin errores.

```bash
git add app/globals.css app/design-tokens.test.ts tailwind.config.ts app/layout.tsx components/layout/ThemeProvider.tsx
git commit -m "feat(diseño): paleta Taller nocturno, Geist Mono y oscuro por defecto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `LayerReveal` y decisión de 3D

**Files:**
- Create: `components/motion/LayerReveal.tsx`, `components/motion/LayerReveal.test.tsx`
- Create: `components/home/hero-3d/render-env.ts`, `components/home/hero-3d/render-env.test.ts`

**Interfaces:**
- Produces: `LayerReveal({ children, className?, delay? }: { children: ReactNode; className?: string; delay?: number })`.
- Produces: `interface RenderEnv { reducedMotion: boolean; webgl: boolean; coarsePointer: boolean; cores: number | undefined }`, `shouldRender3d(env: RenderEnv): boolean`, `readRenderEnv(): RenderEnv`.

- [ ] **Step 1: Tests**

`components/home/hero-3d/render-env.test.ts`:

```ts
import { shouldRender3d, type RenderEnv } from './render-env';

const desktop: RenderEnv = { reducedMotion: false, webgl: true, coarsePointer: false, cores: 8 };

describe('shouldRender3d', () => {
  it('muestra 3D en un escritorio normal', () => {
    expect(shouldRender3d(desktop)).toBe(true);
  });

  it('respeta reducir movimiento', () => {
    expect(shouldRender3d({ ...desktop, reducedMotion: true })).toBe(false);
  });

  it('cae a imagen sin WebGL', () => {
    expect(shouldRender3d({ ...desktop, webgl: false })).toBe(false);
  });

  it('cae a imagen en un celular de 4 núcleos o menos', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: 4 })).toBe(false);
  });

  it('muestra 3D en un celular potente', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: 8 })).toBe(true);
  });

  it('trata núcleos desconocidos en celular como equipo modesto', () => {
    expect(shouldRender3d({ ...desktop, coarsePointer: true, cores: undefined })).toBe(false);
  });
});
```

`components/motion/LayerReveal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LayerReveal } from './LayerReveal';

beforeAll(() => {
  // jsdom no trae IntersectionObserver y framer-motion lo usa para whileInView.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('LayerReveal', () => {
  it('renderiza su contenido', () => {
    render(
      <LayerReveal className="x">
        <p>Hola capa</p>
      </LayerReveal>
    );
    expect(screen.getByText('Hola capa')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run components/home/hero-3d/render-env.test.ts components/motion/LayerReveal.test.tsx`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: Implementar**

`components/home/hero-3d/render-env.ts`:

```ts
export interface RenderEnv {
  reducedMotion: boolean;
  webgl: boolean;
  coarsePointer: boolean;
  cores: number | undefined;
}

/**
 * La pieza 3D es decoración: si hay cualquier duda sobre el equipo, se muestra
 * la foto. Un celular modesto calentándose en la home vende menos que una foto.
 */
export function shouldRender3d(env: RenderEnv): boolean {
  if (env.reducedMotion || !env.webgl) return false;
  if (env.coarsePointer && (env.cores ?? 0) <= 4) return false;
  return true;
}

export function readRenderEnv(): RenderEnv {
  const matches = (query: string) =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }

  return {
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
    webgl,
    coarsePointer: matches('(pointer: coarse)'),
    cores: typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
  };
}
```

`components/motion/LayerReveal.tsx`:

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

const LAYERS = 12;
// Avanza en saltos, como una impresora que sube de capa, no en un fundido continuo.
const stepped = (t: number) => Math.min(1, Math.ceil(t * LAYERS) / LAYERS);

export function LayerReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: stepped }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run components/home/hero-3d/render-env.test.ts components/motion/LayerReveal.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add components/motion/LayerReveal.tsx components/motion/LayerReveal.test.tsx components/home/hero-3d/render-env.ts components/home/hero-3d/render-env.test.ts
git commit -m "feat(diseño): LayerReveal y decisión de 3D según el equipo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Header y Footer

**Files:**
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/Footer.tsx`

**Interfaces:**
- Consumes: clase `.ml-header` y colores Tailwind de la Tarea 1.
- Produces: nada nuevo; mismos enlaces y comportamiento.

- [ ] **Step 1: Header**

En `components/layout/Header.tsx`:

- El `<header className="glass-surface sticky …">` pasa a:

```tsx
    <header className="ml-header sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
```

- El badge del carrito (`<span className="absolute -right-1 -top-1 rounded-full bg-brand …">`) pasa a:

```tsx
            <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 font-mono text-xs font-semibold text-on-accent">
```

- La marca (`className="ml-brand flex items-center gap-2 text-xl font-extrabold"`) pasa a `className="ml-brand flex items-center gap-2 text-lg font-semibold tracking-tight"`.
- La constante `linkClass` del archivo pasa a `'text-sm text-muted transition-colors hover:text-[color:var(--heading)]'`.

- [ ] **Step 2: Footer**

Reemplazar `components/layout/Footer.tsx` completo:

```tsx
import Link from 'next/link';
import { CONTACT, SITE_NAME, whatsappUrl } from '@/lib/site';

const linkClass = 'text-muted transition-colors hover:text-[color:var(--heading)]';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface px-6 py-12 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div>
          <p className="text-base font-semibold tracking-tight" style={{ color: 'var(--heading)' }}>
            {SITE_NAME}
          </p>
          <p className="mt-2 max-w-xs font-mono text-xs text-muted">Impresión 3D · Chile</p>
        </div>

        <nav aria-label="Enlaces del sitio" className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Tienda</p>
          <Link href="/catalogo" className={linkClass}>Catálogo</Link>
          <Link href="/cotizacion" className={linkClass}>Pedir cotización</Link>
          <Link href="/cuenta" className={linkClass}>Mi cuenta</Link>
        </nav>

        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Contacto</p>
          <a href={whatsappUrl('Hola, quiero consultar por un producto')} target="_blank" rel="noreferrer" className={linkClass}>
            WhatsApp
          </a>
          <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noreferrer" className={linkClass}>
            Instagram
          </a>
          <a href={`mailto:${CONTACT.email}`} className={linkClass}>
            {CONTACT.email}
          </a>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl font-mono text-xs text-muted">
        © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
```

- [ ] **Step 3: Verificar y commitear**

Run: `npm test` → PASS. `npm run build` → sin errores.

```bash
git add components/layout/Header.tsx components/layout/Footer.tsx
git commit -m "feat(diseño): header y footer con la paleta nueva

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `ProductCard`

**Files:**
- Modify: `components/catalog/ProductCard.tsx`
- Create: `components/catalog/ProductCard.test.tsx` (si ya existe, agregar estos casos)

**Interfaces:**
- Consumes: `LayerReveal` (Tarea 2), `useCartStore` (`addItem`, `openDrawer`), `formatClp`, `PLACEHOLDER_IMAGE`.
- Produces: `ProductCard({ product, priority?, large? }: { product: Product; priority?: boolean; large?: boolean })`. `large` sólo cambia tipografía y `sizes` de la imagen.

- [ ] **Step 1: Test que fija el comportamiento actual**

`components/catalog/ProductCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/lib/cart/cart-store';
import type { Product } from '@/lib/catalog/types';

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const base: Product = {
  id: 'p1',
  slug: 'ocarina',
  name: 'Ocarina de 6 Agujeros',
  description: '',
  priceClp: 9900,
  categorySlug: 'juguetes',
  categoryName: 'Juguetes',
  imageUrl: '/products/ocarina-1.jpg',
  featured: true,
};

describe('ProductCard', () => {
  beforeEach(() => useCartStore.setState({ items: [] }));

  it('agrega al carrito un producto sin colores', async () => {
    render(<ProductCard product={base} />);
    await userEvent.click(screen.getByRole('button', { name: /agregar al carrito/i }));
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('manda a la ficha cuando hay colores', () => {
    render(<ProductCard product={{ ...base, variants: [{ name: 'Verde', colorHex: '#0f0' }] }} />);
    expect(screen.getByRole('link', { name: /elegir color/i })).toHaveAttribute('href', '/producto/ocarina');
    expect(screen.queryByRole('button', { name: /agregar al carrito/i })).toBeNull();
  });

  it('muestra el precio en pesos', () => {
    render(<ProductCard product={base} />);
    expect(screen.getByText(/9\.900/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr contra el componente actual**

Run: `npx vitest run components/catalog/ProductCard.test.tsx`
Expected: PASS (los tests fijan lo que no debe romperse). Si el arreglo del store no se llama `items`, usar el nombre real de `lib/cart/cart-store.ts`.

- [ ] **Step 3: Reescribir el componente**

Reemplazar `components/catalog/ProductCard.tsx` completo:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/cart-store';
import { PLACEHOLDER_IMAGE, formatClp } from '@/lib/site';
import { LayerReveal } from '@/components/motion/LayerReveal';

export function ProductCard({
  product,
  priority = false,
  large = false,
}: {
  product: Product;
  priority?: boolean;
  large?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const [src, setSrc] = useState(product.imageUrl || PLACEHOLDER_IMAGE);

  const variants = product.variants ?? [];
  // With more than one colour the choice belongs on the ficha — adding a
  // colour the shopper never picked is how you get returns.
  const hasChoice = variants.length > 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-[color:var(--accent)]"
    >
      <Link href={`/producto/${product.slug}`} className="flex flex-1 flex-col">
        <LayerReveal className="relative w-full flex-1 overflow-hidden rounded-xl bg-surface-2">
          <div className="relative aspect-square h-full w-full">
            <Image
              src={src}
              alt={product.name}
              fill
              sizes={large ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
              priority={priority}
              onError={() => setSrc(PLACEHOLDER_IMAGE)}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
        </LayerReveal>
        <h3 className={`mt-3 font-medium tracking-tight ${large ? 'text-xl' : 'text-base'}`} style={{ color: 'var(--heading)' }}>
          {product.name}
        </h3>
      </Link>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-accent-text">{formatClp(product.priceClp)}</p>
        {hasChoice && (
          <div className="flex items-center gap-1" aria-label={`${variants.length} colores disponibles`}>
            {variants.slice(0, 5).map((variant) => (
              <span
                key={variant.name}
                title={variant.name}
                className="h-3 w-3 rounded-full border border-line"
                style={{ background: variant.colorHex ?? 'transparent' }}
              />
            ))}
          </div>
        )}
      </div>

      {hasChoice ? (
        <Link
          href={`/producto/${product.slug}`}
          className="mt-3 rounded-full border border-line px-4 py-2 text-center text-sm font-medium transition-colors hover:border-[color:var(--accent)]"
        >
          Elegir color
        </Link>
      ) : (
        <button
          onClick={() => {
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              unitPriceClp: product.priceClp,
              imageUrl: product.imageUrl,
            });
            openDrawer();
          }}
          className="mt-3 rounded-full bg-accent py-2 text-sm font-medium text-on-accent transition-transform active:scale-[0.98]"
        >
          Agregar al carrito
        </button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run components/catalog` → PASS (incluye los tests existentes de catálogo).

- [ ] **Step 5: Commit**

```bash
git add components/catalog/ProductCard.tsx components/catalog/ProductCard.test.tsx
git commit -m "feat(diseño): tarjeta de producto con revelado por capas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Secciones de la home (sin 3D)

**Files:**
- Create: `components/home/copy.ts`
- Rewrite: `components/home/Hero.tsx`
- Create: `components/home/Marquee.tsx`, `FeaturedBento.tsx`, `ProcessSteps.tsx`, `CategoryTiles.tsx`, `QuoteCta.tsx`
- Create: `components/home/home-sections.test.tsx`
- Modify: `app/page.tsx`
- Delete: `components/home/FeaturedProducts.tsx`, `CategoryChips.tsx`, `QuoteBanner.tsx`

**Interfaces:**
- Consumes: `ProductCard` (`large`), `LayerReveal`.
- Produces: `Hero({ art }: { art?: ReactNode })` — la Tarea 7 le pasa `<HeroPiece />`. `FeaturedBento({ products }: { products: Product[] })`. `CATEGORIES`, `TECH_FACTS`, `PROCESS_STEPS` desde `copy.ts`.

- [ ] **Step 1: Test**

`components/home/home-sections.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { FeaturedBento } from './FeaturedBento';
import { CategoryTiles } from './CategoryTiles';
import { Marquee } from './Marquee';
import { Hero } from './Hero';
import { CATEGORIES } from './copy';
import type { Product } from '@/lib/catalog/types';

beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const product = (id: string, featured: boolean): Product => ({
  id,
  slug: `p-${id}`,
  name: `Pieza ${id}`,
  description: '',
  priceClp: 1000,
  categorySlug: 'juguetes',
  categoryName: 'Juguetes',
  imageUrl: '/products/x.jpg',
  featured,
});

describe('home', () => {
  it('no muestra destacados si no hay', () => {
    const { container } = render(<FeaturedBento products={[product('1', false)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra sólo los destacados', () => {
    render(<FeaturedBento products={[product('1', true), product('2', false), product('3', true)]} />);
    expect(screen.getByText('Pieza 1')).toBeInTheDocument();
    expect(screen.getByText('Pieza 3')).toBeInTheDocument();
    expect(screen.queryByText('Pieza 2')).toBeNull();
  });

  it('enlaza cada categoría al catálogo filtrado', () => {
    render(<CategoryTiles />);
    CATEGORIES.forEach((category) => {
      expect(screen.getByRole('link', { name: new RegExp(category.name, 'i') })).toHaveAttribute(
        'href',
        `/catalogo?category=${category.slug}`
      );
    });
  });

  it('oculta la copia duplicada de la cinta a lectores de pantalla', () => {
    const { container } = render(<Marquee />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('el hero tiene un único h1 y los dos llamados', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute('href', '/catalogo');
    expect(screen.getByRole('link', { name: /^cotizar$/i })).toHaveAttribute('href', '/cotizacion');
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run components/home/home-sections.test.tsx`
Expected: FAIL, módulos no encontrados.

- [ ] **Step 3: `components/home/copy.ts`**

```ts
/**
 * Todos los textos con afirmaciones sobre el taller están aquí para que Pablo
 * los revise en un solo lugar: no se publica nada técnico que no sea cierto.
 */
export const TECH_FACTS = ['Impresión 3D', 'Hecho en Chile', 'Piezas a pedido', 'Diseños a medida', 'Despacho a regiones'];

export const CATEGORIES = [
  { slug: 'llaveros', name: 'Llaveros' },
  { slug: 'figuras-personajes', name: 'Figuras de Personajes' },
  { slug: 'figuras-decorativas', name: 'Figuras Decorativas' },
  { slug: 'maceteros', name: 'Maceteros' },
  { slug: 'juguetes', name: 'Juguetes' },
];

export const PROCESS_STEPS = [
  { title: 'Diseño', body: 'Partimos de un modelo propio o del tuyo y lo ajustamos para que se pueda imprimir bien.' },
  { title: 'Laminado', body: 'El software corta la pieza en capas y define cómo se construye cada una.' },
  { title: 'Impresión', body: 'La impresora deposita filamento capa sobre capa hasta formar la pieza.' },
  { title: 'Terminación', body: 'Retiramos soportes, revisamos cada detalle y la dejamos lista para entregar.' },
];
```

- [ ] **Step 4: Componentes**

`components/home/Hero.tsx` (reemplazo completo):

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Hero({ art }: { art?: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-24">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Taller de impresión 3D · Chile</p>
        <h1
          className="mt-5 text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ color: 'var(--heading)' }}
        >
          Piezas que nacen
          <br />
          <span className="text-accent-text">capa por capa.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Llaveros, figuras, maceteros y juguetes impresos en 3D. Elige una pieza del catálogo o pide una a medida.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent transition-transform active:scale-[0.98]"
          >
            Ver catálogo
          </Link>
          <Link
            href="/cotizacion"
            className="rounded-full border border-line px-6 py-3 font-medium transition-colors hover:border-[color:var(--accent)]"
          >
            Cotizar
          </Link>
        </div>
      </div>
      <div className="relative aspect-square w-full max-w-[520px] justify-self-center">{art}</div>
    </section>
  );
}
```

`components/home/Marquee.tsx`:

```tsx
import { TECH_FACTS } from './copy';

function Row() {
  return (
    <>
      {TECH_FACTS.map((fact) => (
        <span key={fact} className="flex items-center gap-6 pr-6">
          {fact}
          <span className="text-accent-text">/</span>
        </span>
      ))}
    </>
  );
}

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-line py-4 font-mono text-sm uppercase tracking-[0.2em] text-muted">
      <div className="ml-marquee__track">
        <div className="flex">
          <Row />
        </div>
        {/* Copia para que el bucle no tenga corte; los lectores de pantalla la saltan. */}
        <div className="flex" aria-hidden="true">
          <Row />
        </div>
      </div>
    </div>
  );
}
```

`components/home/FeaturedBento.tsx`:

```tsx
import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/catalog/ProductCard';

export function FeaturedBento({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured).slice(0, 7);

  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Recién salidas de la cama</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--heading)' }}>
            Destacados
          </h2>
        </div>
        <Link href="/catalogo" className="text-sm text-muted underline-offset-4 hover:underline">
          Ver todo
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {featured.map((product, index) => (
          <div key={product.id} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
            <ProductCard product={product} priority={index < 2} large={index === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
```

`components/home/ProcessSteps.tsx`:

```tsx
import { LayerReveal } from '@/components/motion/LayerReveal';
import { PROCESS_STEPS } from './copy';

export function ProcessSteps() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Cómo se hace</p>
      <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: 'var(--heading)' }}>
        De un archivo a una pieza en tus manos.
      </h2>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROCESS_STEPS.map((step, index) => (
          <li key={step.title}>
            <LayerReveal delay={index * 0.15} className="h-full rounded-2xl border border-line bg-surface p-6">
              <p className="font-mono text-sm text-accent-text">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-6 text-lg font-medium" style={{ color: 'var(--heading)' }}>
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </LayerReveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`components/home/CategoryTiles.tsx`:

```tsx
import Link from 'next/link';
import { CATEGORIES } from './copy';

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Categorías</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/catalogo?category=${category.slug}`}
            className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-[color:var(--accent)]"
          >
            <span className="text-lg font-medium tracking-tight" style={{ color: 'var(--heading)' }}>
              {category.name}
            </span>
            <span aria-hidden="true" className="font-mono text-sm text-muted transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

`components/home/QuoteCta.tsx`:

```tsx
import Link from 'next/link';
import { LayerReveal } from '@/components/motion/LayerReveal';

export function QuoteCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <LayerReveal className="rounded-3xl border border-[color:var(--accent)] bg-surface p-10 sm:p-16">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-text">A medida</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: 'var(--heading)' }}>
          ¿Tienes una idea? Te la imprimimos.
        </h2>
        <p className="mt-4 max-w-lg text-muted">Cuéntanos qué necesitas y te enviamos una cotización a medida.</p>
        <Link
          href="/cotizacion"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent transition-transform active:scale-[0.98]"
        >
          Pedir cotización
        </Link>
      </LayerReveal>
    </section>
  );
}
```

`app/page.tsx` — reemplazar los cuatro imports de `@/components/home/*` por:

```tsx
import { Hero } from '@/components/home/Hero';
import { Marquee } from '@/components/home/Marquee';
import { FeaturedBento } from '@/components/home/FeaturedBento';
import { ProcessSteps } from '@/components/home/ProcessSteps';
import { CategoryTiles } from '@/components/home/CategoryTiles';
import { QuoteCta } from '@/components/home/QuoteCta';
```

y el `return` por:

```tsx
  return (
    <main>
      <Hero />
      <Marquee />
      <FeaturedBento products={products} />
      <ProcessSteps />
      <CategoryTiles />
      <QuoteCta />
    </main>
  );
```

(`revalidate`, `metadata` y la carga de productos con su `try/catch` no cambian.)

Borrar los reemplazados:

```bash
git rm components/home/FeaturedProducts.tsx components/home/CategoryChips.tsx components/home/QuoteBanner.tsx
```

- [ ] **Step 5: Ver que pasa**

Run: `npx vitest run components/home` → PASS (5 tests). `npm run build` → sin errores (confirma que nada más importaba los archivos borrados).

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/home
git commit -m "feat(home): secciones nuevas — hero, cinta, bento, proceso, categorías y cotización

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Progreso de impresión y escena Three.js

**Files:**
- Modify: `package.json` (`three`, `@types/three`)
- Create: `components/home/hero-3d/print-progress.ts`, `print-progress.test.ts`
- Create: `components/home/hero-3d/model.ts`
- Create: `components/home/hero-3d/scene.ts`

**Interfaces:**
- Produces: `interface PrintTiming { durationMs: number; layers: number; height: number }`, `clipHeightAt(elapsedMs: number, timing: PrintTiming): number`.
- Produces: `PIECE_HEIGHT: number`, `PIECE_RADIUS: number`, `buildPiece(clippingPlanes: Plane[]): Group`.
- Produces: `interface SceneHandle { dispose(): void }`, `createPrintScene(canvas: HTMLCanvasElement, options?: { onFirstFrame?: () => void }): SceneHandle`.

- [ ] **Step 1: Instalar three**

Run: `npm install three` y luego `npm install -D @types/three`

- [ ] **Step 2: Test del progreso**

`components/home/hero-3d/print-progress.test.ts`:

```ts
import { clipHeightAt } from './print-progress';

const timing = { durationMs: 2000, layers: 10, height: 3 };

describe('clipHeightAt', () => {
  it('parte vacía', () => {
    expect(clipHeightAt(0, timing)).toBe(0);
    expect(clipHeightAt(-50, timing)).toBe(0);
  });

  it('termina por encima de la pieza para no recortar la tapa', () => {
    expect(clipHeightAt(2000, timing)).toBeGreaterThan(3);
    expect(clipHeightAt(99999, timing)).toBeGreaterThan(3);
  });

  it('avanza en saltos de una capa', () => {
    const layer = timing.height / timing.layers;
    [1, 150, 399, 1000, 1999].forEach((ms) => {
      const y = clipHeightAt(ms, timing);
      expect(Math.abs(y / layer - Math.round(y / layer))).toBeLessThan(1e-9);
    });
  });

  it('nunca baja', () => {
    let previous = 0;
    for (let ms = 0; ms <= 2000; ms += 37) {
      const y = clipHeightAt(ms, timing);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });
});
```

Run: `npx vitest run components/home/hero-3d/print-progress.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar el progreso**

`components/home/hero-3d/print-progress.ts`:

```ts
export interface PrintTiming {
  durationMs: number;
  layers: number;
  height: number;
}

/**
 * Altura del plano de corte en cada instante. Sube de a una capa entera, como
 * una impresora real, en vez de deslizarse: el salto es lo que se lee como
 * «imprimiendo».
 */
export function clipHeightAt(elapsedMs: number, { durationMs, layers, height }: PrintTiming): number {
  if (elapsedMs <= 0) return 0;
  // Un poco por encima del tope: con el plano justo en la tapa, la cara superior parpadea.
  if (elapsedMs >= durationMs) return height * 1.02;
  const layer = Math.floor((elapsedMs / durationMs) * layers) + 1;
  return (Math.min(layer, layers) / layers) * height;
}
```

Run el test → PASS.

- [ ] **Step 4: Modelo (Frasco Texturizado)**

`components/home/hero-3d/model.ts`:

```ts
import {
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  type Plane,
  Vector2,
} from 'three';

export const PIECE_HEIGHT = 3;
export const PIECE_RADIUS = 1.05;

const BODY_TOP = 2.35;

/**
 * Frasco con las líneas de capa a la vista: el relieve horizontal es
 * exactamente lo que deja una impresora FDM, así que el modelo cuenta el
 * oficio sin texto.
 */
function bodyProfile(): Vector2[] {
  const points: Vector2[] = [new Vector2(0, 0), new Vector2(0.9, 0)];
  const segments = 140;
  for (let i = 0; i <= segments; i += 1) {
    const y = (i / segments) * BODY_TOP;
    const shoulder = y > 1.95 ? (y - 1.95) * 0.55 : 0;
    const ridge = 0.022 * Math.sin(y * 55);
    points.push(new Vector2(1 - shoulder + ridge, y));
  }
  points.push(new Vector2(0.72, BODY_TOP));
  return points;
}

export function buildPiece(clippingPlanes: Plane[]): Group {
  const material = new MeshStandardMaterial({
    color: 0x3fcf74,
    roughness: 0.55,
    metalness: 0.05,
    clippingPlanes,
    clipShadows: true,
    side: DoubleSide,
  });

  const group = new Group();

  group.add(new Mesh(new LatheGeometry(bodyProfile(), 96), material));

  const lidHeight = PIECE_HEIGHT - BODY_TOP - 0.05;
  const lid = new Mesh(new CylinderGeometry(0.8, 0.8, lidHeight, 72, 1), material);
  lid.position.y = BODY_TOP + 0.05 + lidHeight / 2;
  group.add(lid);

  return group;
}
```

- [ ] **Step 5: Escena**

`components/home/hero-3d/scene.ts`:

```ts
import {
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Scene,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { PIECE_HEIGHT, PIECE_RADIUS, buildPiece } from './model';
import { clipHeightAt } from './print-progress';

export interface SceneHandle {
  dispose(): void;
}

const TIMING = { durationMs: 2600, layers: 36, height: PIECE_HEIGHT };

export function createPrintScene(
  canvas: HTMLCanvasElement,
  options: { onFirstFrame?: () => void } = {}
): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, PIECE_HEIGHT * 0.75, 8);
  camera.lookAt(0, PIECE_HEIGHT * 0.45, 0);

  scene.add(new HemisphereLight(0xe8fff0, 0x0b0d0c, 1.1));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  // Contraluz verde: separa la pieza del fondo oscuro sin necesidad de sombra.
  const rim = new DirectionalLight(0x4ade80, 1.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // Recorta todo lo que está por encima de la capa actual.
  const clip = new Plane(new Vector3(0, -1, 0), 0);
  const piece = buildPiece([clip]);
  scene.add(piece);

  // Anillo que marca la capa que se está imprimiendo.
  const ring = new Mesh(
    new TorusGeometry(PIECE_RADIUS * 1.08, 0.012, 8, 96),
    new MeshBasicMaterial({ color: 0x4ade80 })
  );
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const tilt = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  function onPointerMove(event: PointerEvent) {
    target.x = (event.clientY / window.innerHeight - 0.5) * 0.25;
    target.y = (event.clientX / window.innerWidth - 0.5) * 0.5;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  let frame = 0;
  let running = false;
  let elapsed = 0;
  let last = 0;
  let spin = 0;
  let firstFrameSent = false;
  // Sólo se dibuja cuando se ve: fuera de pantalla o con la pestaña oculta no gasta batería.
  let onScreen = true;

  function tick(now: number) {
    if (!onScreen || document.hidden) {
      running = false;
      return;
    }
    const delta = last === 0 ? 0 : Math.min(now - last, 50);
    last = now;
    elapsed += delta;

    const y = clipHeightAt(elapsed, TIMING);
    clip.constant = y;
    ring.position.y = y;
    ring.visible = y < PIECE_HEIGHT;

    spin += delta * 0.00025;
    tilt.x += (target.x - tilt.x) * 0.06;
    tilt.y += (target.y - tilt.y) * 0.06;
    piece.rotation.set(tilt.x, spin + tilt.y, 0);

    renderer.render(scene, camera);
    if (!firstFrameSent) {
      firstFrameSent = true;
      options.onFirstFrame?.();
    }
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    frame = requestAnimationFrame(tick);
  }

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) start();
  });
  visibility.observe(canvas);
  function onVisibilityChange() {
    if (!document.hidden) start();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  start();

  return {
    dispose() {
      cancelAnimationFrame(frame);
      running = false;
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
```

- [ ] **Step 6: Verificar y commitear**

Run: `npm test` → PASS. `npm run build` → sin errores.

```bash
git add package.json package-lock.json components/home/hero-3d/print-progress.ts components/home/hero-3d/print-progress.test.ts components/home/hero-3d/model.ts components/home/hero-3d/scene.ts
git commit -m "feat(home): escena Three.js que imprime la pieza por capas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Montar la pieza en el hero

**Files:**
- Create: `components/home/hero-3d/PrintCanvas.tsx`, `HeroPiece.tsx`, `HeroPiece.test.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createPrintScene`, `SceneHandle` (Tarea 6); `shouldRender3d`, `readRenderEnv` (Tarea 2); `Hero({ art })` (Tarea 5).
- Produces: `HeroPiece()`; `PrintCanvas({ onReady }: { onReady: () => void })`.

- [ ] **Step 1: Test**

`components/home/hero-3d/HeroPiece.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { HeroPiece } from './HeroPiece';

vi.mock('./render-env', () => ({
  readRenderEnv: () => ({ reducedMotion: true, webgl: false, coarsePointer: false, cores: 8 }),
  shouldRender3d: () => false,
}));

describe('HeroPiece', () => {
  it('muestra la foto y no monta el canvas cuando no corresponde 3D', () => {
    const { container } = render(<HeroPiece />);
    expect(screen.getByRole('img', { name: /frasco texturizado/i })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });
});
```

Run: `npx vitest run components/home/hero-3d/HeroPiece.test.tsx` → FAIL (módulo no existe).

- [ ] **Step 2: Implementar**

`components/home/hero-3d/PrintCanvas.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createPrintScene, type SceneHandle } from './scene';

export function PrintCanvas({ onReady }: { onReady: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let handle: SceneHandle | null = null;
    try {
      handle = createPrintScene(canvas, { onFirstFrame: onReady });
    } catch {
      // Si WebGL falla al crear el contexto, queda la foto: no hay nada que avisar.
      return;
    }
    return () => handle?.dispose();
  }, [onReady]);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
```

`components/home/hero-3d/HeroPiece.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { readRenderEnv, shouldRender3d } from './render-env';

// Three.js pesa: se baja recién cuando la página ya está pintada, y nunca en el servidor.
const PrintCanvas = dynamic(() => import('./PrintCanvas').then((m) => m.PrintCanvas), {
  ssr: false,
  loading: () => null,
});

const STATIC_SRC = '/products/frasco-texturizado-1.jpg';

export function HeroPiece() {
  const [use3d, setUse3d] = useState(false);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    setUse3d(shouldRender3d(readRenderEnv()));
  }, []);

  return (
    <div className="absolute inset-0">
      <Image
        src={STATIC_SRC}
        alt="Frasco texturizado impreso en 3D"
        fill
        sizes="(max-width: 768px) 90vw, 520px"
        className={`rounded-3xl object-cover transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}
      />
      {use3d && <PrintCanvas onReady={markReady} />}
    </div>
  );
}
```

En `app/page.tsx` agregar `import { HeroPiece } from '@/components/home/hero-3d/HeroPiece';` y cambiar `<Hero />` por `<Hero art={<HeroPiece />} />`.

- [ ] **Step 3: Ver que pasa**

Run: `npx vitest run components/home` → PASS.

- [ ] **Step 4: Revisar el tamaño**

Run: `npm run build` → sin errores. En la tabla de rutas, `/` no debe subir más de ~10 kB de First Load JS respecto del build de la Tarea 5 (three va en un chunk aparte). Medir el chunk más grande:

```bash
for f in $(ls -S .next/static/chunks/*.js | head -3); do echo "$(gzip -c "$f" | wc -c) $f"; done
```

Expected: el chunk de three ≤ ~180 000 bytes gzip. Si se pasa, revisar que ningún archivo use `import * as THREE`.

- [ ] **Step 5: Commit**

```bash
git add components/home/hero-3d/PrintCanvas.tsx components/home/hero-3d/HeroPiece.tsx components/home/hero-3d/HeroPiece.test.tsx app/page.tsx
git commit -m "feat(home): pieza 3D en el hero con foto de respaldo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Intento con la Calavera Arcoíris (img2threejs)

La spec propone la calavera como primera candidata y el frasco como respaldo. El plan construye primero el frasco (seguro) y en esta tarea intenta la calavera; sólo se adopta si pasa el criterio.

**Files:**
- Create (sólo si se adopta): `components/home/hero-3d/model-calavera.ts`
- Modify (sólo si se adopta): `scene.ts` (import del modelo), `HeroPiece.tsx` (`STATIC_SRC` → `/products/calavera-arcoiris-1.jpg`, `alt` → «Calavera arcoíris impresa en 3D»), `HeroPiece.test.tsx` (regex del `alt` → `/calavera arcoíris/i`).

**Interfaces:**
- Produces (si se adopta): `model-calavera.ts` exporta exactamente `PIECE_HEIGHT`, `PIECE_RADIUS`, `buildPiece(clippingPlanes: Plane[]): Group`, igual que `model.ts`.

- [ ] **Step 1:** Invocar el skill `img2threejs` con `public/products/calavera-arcoiris-1.jpg` (y `-2`, `-3` como vistas extra). Pedir salida como módulo TypeScript con la interfaz de arriba, imports con nombre desde `three` (nunca `import * as THREE`), altura normalizada a 3, base en `y = 0`, y el arreglo `clippingPlanes` aplicado a **todos** sus materiales.
- [ ] **Step 2:** Cambiar el import en `scene.ts` a `./model-calavera`, `npm run dev`, abrir `http://localhost:3000` y comparar contra la foto.
- [ ] **Step 3: Criterio.** Se adopta sólo si se reconoce a primera vista como la calavera de la foto, el efecto de capas se ve bien y el chunk sigue dentro del presupuesto. Si no, se revierte el import, se borra `model-calavera.ts` y queda el frasco.
- [ ] **Step 4:** `npm test` y `npm run build`. Commit sólo si se adoptó:

```bash
git add components/home/hero-3d
git commit -m "feat(home): calavera arcoíris como pieza del hero

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Pulido con los skills de diseño y verificación final

**Files:** los que surjan de la revisión, sólo dentro del alcance de la spec.

- [ ] **Step 1:** `npm run dev`. Revisar `http://localhost:3000` con `/browse` en 1440 px y 375 px, oscuro y claro. Capturas antes de tocar nada.
- [ ] **Step 2:** Pasar la home por `impeccable` (crítica/auditoría) y `design-taste-frontend` (pre-flight). Aplicar sólo hallazgos concretos: jerarquía, espaciado, contraste, estados de foco, patrones genéricos.
- [ ] **Step 3:** Con «reducir movimiento» emulado (DevTools → Rendering → `prefers-reduced-motion: reduce`): la cinta queda quieta, no hay revelados y se ve la foto en vez del 3D.
- [ ] **Step 4:** Navegar a `/catalogo`, una ficha, el carrito y `/checkout` en ambos temas: nada ilegible ni roto (sólo heredan colores).
- [ ] **Step 5:** Lighthouse móvil de `/`: rendimiento y accesibilidad no peores que en `master`.
- [ ] **Step 6:** Agregar un producto sin colores al carrito desde la home y verlo en el carrito.
- [ ] **Step 7:** Mostrar a Pablo `components/home/copy.ts` y confirmar que cada frase de `TECH_FACTS` y `PROCESS_STEPS` es cierta (p. ej. «Despacho a regiones»). Corregir lo que diga.
- [ ] **Step 8:** `npm test` y `npm run build` finales. Commit de los ajustes:

```bash
git add -A components app
git commit -m "fix(home): ajustes de la revisión de diseño

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9:** Indicar a Pablo: GitHub Desktop → rama `rediseno-home` → «Publish branch» → abrir la URL de vista previa que genera Vercel. Se fusiona a `master` sólo cuando la apruebe.
