# MadLayerz — madlayerz.cl

Tienda de piezas impresas en 3D. Catálogo, cotizaciones a medida, pago en línea y panel de
administración. Negocio real, en producción, en Chile. Precios en CLP, textos en español de Chile.

**Responsable:** Pablo Toro. No es un equipo: cada cambio que entra lo revisa y lo publica él solo.

## Stack

Next.js 14.2.35 (App Router) · Supabase (Postgres, Auth, RLS, Storage) · Tailwind · Zustand
(carrito, con `persist`) · Zod · framer-motion · Resend (correo) · Mercado Pago (Checkout Pro).
Deploy en Vercel desde la rama `master`. Tests con Vitest.

```
npm run dev      # desarrollo
npm run build    # build de producción (lo mismo que corre Vercel)
npm run lint     # next lint — Vercel falla el build si esto falla
npm run test     # vitest run
```

## Cómo se trabaja en este repo

- **Antes de dar por terminado cualquier cambio, corre `npm run build`.** Vercel trata los
  errores de lint y de tipos como errores de build; un import sin usar tumba el despliegue.
- Pablo publica con **GitHub Desktop** (commit + push a `master`); Vercel despliega solo.
- **Nunca pongas secretos en el repo.** Las claves viven en Vercel → Settings → Environment
  Variables. Si un cambio necesita una variable nueva, dilo explícitamente en vez de inventarla.
- Los cambios de esquema van como SQL en `supabase/`, idempotentes (`if not exists`,
  `on conflict do update`), para pegar en el SQL Editor de Supabase. **No hay migraciones
  automáticas.**
- Comentarios y textos de interfaz en español. Los comentarios explican *por qué*, no *qué*.

## Trampas conocidas

Estas ya costaron builds rotos o tiempo perdido. Vale la pena tenerlas presentes:

1. **`tsconfig.json` no define `target`.** TypeScript 5 cae a ES5, así que iterar un `Map` o un
   `Set` directamente falla con `--downlevelIteration`. Usa `Array.from(mapa.values())`.
2. **El narrowing de un binding importado no sobrevive dentro de un callback.** Si estrechas
   `FOO` importado y lo usas en un closure, TypeScript vuelve a ensancharlo. Cópialo a una const
   local primero (`const notifyTo = NOTIFICATION_EMAIL;`).
3. **Un route handler sólo admite ciertos `export`.** Un `export const MIS_ESTADOS = [...]` en un
   `route.ts` rompe el build con *"is not a valid Route export field"*. Déjalo sin exportar o
   muévelo a `lib/`.
4. **Vercel no aplica una variable de entorno editada a un deploy que ya está en línea.** Después
   de editarla hay que hacer **Redeploy**, o el código sigue viendo el valor viejo.
5. **La home se cachea.** `app/page.tsx` necesita `revalidate` o muestra productos borrados.
6. El build de Vercel es la única verificación real: no hay CI. `ci.yml` quedó escrito pero nunca
   se instaló (`.github/` estaba protegido contra escritura remota) — instalarlo sigue pendiente.

## Reglas de negocio que no se negocian

- **El servidor vuelve a calcular todos los precios.** `lib/orders/price-order.ts` recalcula el
  pedido desde la base de datos y `lib/validation/order-schema.ts` rechaza cualquier precio que
  venga del navegador. Esto arregló un agujero real: antes `/api/orders` confiaba en el total que
  mandaba el cliente. **No reintroduzcas precios de cliente.**
- **El estado de un pago nunca se toma del aviso.** `confirmMercadoPagoPayment` siempre vuelve a
  consultar el pago a Mercado Pago con nuestro token y sólo marca `pagado` si está aprobado, es
  del pedido correcto, en CLP y por el monto exacto. Un webhook falsificado no sirve de nada.
- El `update` a `pagado` lleva `.eq('status', 'pendiente_pago').select('id')`: el webhook y el
  retorno del cliente compiten, y sólo el que gana manda el correo.
- El color elegido viaja hasta el pedido (`order_items.variant_name`) y aparece en el correo.
  `priceOrder` rechaza un color que el producto no ofrece.
- `requireAdmin()` devuelve **404**, no 403: el panel no debe revelar que existe.

## Mapa del código

```
app/
  api/orders/            crea el pedido; re-precia en servidor; NO manda correo
  api/quotes/            cotizaciones; valida con Zod; notifica por Resend
  api/payments/mercadopago/{create,webhook}/
  checkout/              3 pasos; checkout/resultado confirma el pago al volver
  admin/                 productos, categorías, pedidos, cotizaciones (requireAdmin)
lib/
  orders/price-order.ts  re-precio y validación de variantes
  payments/mercadopago.ts        lógica pura y testeada (preferencia, decisión de pago)
  payments/mercadopago-server.ts llamadas a la API de Mercado Pago + confirmación
  supabase/admin-client.ts       service role; sólo servidor, lanza si lo importa el navegador
  email/                 resend-client (helper que SÍ loguea el error), plantillas
  site.ts                CONTACT, SITE_URL, formatClp
supabase/                SQL para pegar en el editor de Supabase
components/brand/        logo animado (SVG por trazados + keyframes en globals.css)
```

## Estado actual (4 oct 2026)

**Funcionando en producción:** catálogo con fotos reales y variantes de color, ficha técnica,
carrito, checkout, panel de admin, cotizaciones, y **pago con Mercado Pago verificado de punta a
punta** (compra de prueba aprobada, webhook en 200, pedido marcado `pagado`).

**Pendiente, en orden de urgencia:**

1. **Boleta electrónica (SII).** Legalmente obligatoria antes de la primera venta real. La pasarela
   de pago no la emite.
2. **Credenciales de producción de Mercado Pago.** Hoy está el token de prueba: un comprador real
   no puede pagar. Se cambia `MERCADOPAGO_ACCESS_TOKEN` en Vercel + Redeploy.
3. **Resend sin configurar.** `madlayerz.cl` no está verificado (sin DKIM ni SPF) y faltan
   `RESEND_API_KEY`, `RESEND_FROM` y `QUOTE_NOTIFICATION_EMAIL`. **Hoy no sale ningún correo.**
   Ver `docs/correo-resend.md`.
4. **Flow** como segundo medio de pago: aparece como «Próximamente» en el checkout.
5. **Interruptor activo/inactivo en productos**, para ocultar del catálogo los que no se pueden
   borrar porque tienen pedidos asociados (Sonic, Llavero Baby Yoda).
6. El panel de admin **no edita** variantes ni ficha técnica; eso sólo entra por SQL.

**Decisiones que dependen de Pablo, no de código:**

- La «Figura Articulada» podría ser un personaje con licencia. Sin confirmar.
- Hay 4 fotos dejadas fuera del catálogo por riesgo de propiedad intelectual (Bart Simpson, budas
  Shrek / Pepe / Hello Kitty).
- El producto con slug `hipopotamo-marmol` **es un gato**. `supabase/FIX-GATO-MARMOL.sql` lo
  corrige; falta ejecutarlo.

## Contacto publicado

`madlayerz@gmail.com` · `+56 9 4550 6614`. El dominio no tiene MX, así que ninguna dirección
`@madlayerz.cl` recibe correo.

## Documentación

`docs/` tiene el detalle de cada frente: pagos, correo, catálogo y variantes, logo animado, y el
estado histórico del proyecto. Léelos antes de tocar esas áreas.
