# Histórico — 10 sep 2026

Registro del estado inicial del proyecto y de la primera tanda grande de cambios. Está superado
por lo que vino después (catálogo real, logo, pagos), pero explica por qué el código está como
está.

---

## A. Diagnóstico inicial

Stack: Next.js 14.2.35 (App Router) + Supabase + Tailwind + Zustand + Zod + framer-motion +
Resend. Deploy en Vercel. Vitest (~25 archivos `.test`).

### Funcionaba

Home, catálogo con filtros, ficha de producto, carrito, checkout de 3 pasos. Cotizaciones
(formulario → `POST /api/quotes` → `quote_requests` + email al admin). Cuentas con historial y
libreta de direcciones. Panel admin protegido con `requireAdmin()`, que devuelve 404 a quien no
sea admin.

### Bugs confirmados

1. **Home cacheada.** `app/page.tsx` era Server Component sin `revalidate`, así que Vercel la
   servía estática: mostraba productos ya borrados, con links a 404.
2. **Faltaba `middleware.ts`.** `lib/supabase/server-client.ts` comentaba «middleware refreshes
   the session instead», pero el archivo no existía. Al expirar el token, `/cuenta` y `/admin`
   veían al usuario como anónimo y el propio admin recibía 404.
3. **`/products/placeholder.svg` no existía**, aunque la API admin ya lo usaba de fallback.
4. **Header sin versión móvil**: overflow horizontal bajo ~675 px.

### Faltaba

Pagos en línea (`PaymentStep` decía literalmente «El pago aún no se procesa realmente»), bandeja
de cotizaciones, edición de productos, correo al cliente, SEO, fotos reales, datos de contacto
reales.

---

## B. Cambios aplicados (52 archivos)

### Bugs

`revalidate = 60` en la home, más `revalidatePath()` en cada escritura del admin.
`middleware.ts` nuevo que refresca el token de Supabase en cada request. `placeholder.svg` creado,
con `onError` en `ProductCard`. Header con menú hamburguesa bajo `md`.

### Seguridad

**Precios recalculados en el servidor** (`lib/orders/price-order.ts` +
`lib/validation/order-schema.ts`). Antes `/api/orders` insertaba `unitPriceClp` y `subtotalClp`
tal cual venían del navegador: se podía comprar cualquier cosa por $1. Fue crítico resolverlo
antes de conectar cualquier pasarela.

Cabeceras de seguridad en `next.config.mjs` (nosniff, X-Frame-Options, Referrer-Policy,
Permissions-Policy, HSTS) y `poweredByHeader: false`.

### Rendimiento y SEO

`/catalogo` pasó de `useEffect` a Server Component (indexable, más rápido, y se eliminó el segundo
cliente GoTrue que ensuciaba la consola). `next/image` en todas las imágenes. `generateMetadata`
por producto + JSON-LD `Product`. `noindex` en checkout, cuenta, login y registro. `app/sitemap.ts`
y `app/robots.ts`. Fuente Geist con `next/font/local`. `app/not-found.tsx`.

### Features

Editar productos en el admin (`PATCH /api/admin/products`); el `DELETE` explica el fallo por FK en
vez de devolver 500. Bandeja de cotizaciones con estados. Correo de confirmación al cliente y
aviso al taller. Checkout con indicador de pasos, resumen y manejo de errores: el carrito ya no se
vacía si el pedido falla. `/catalogo?category=` arreglado.

### Nota sobre verificación

Esa sesión no tenía npm en el contenedor, así que **no se corrió `next build` ni `vitest`**. De
ahí salieron los cuatro builds rotos que siguieron, y de ahí nació la costumbre de verificar
tipos con los `.d.ts` reales antes de pushear.
