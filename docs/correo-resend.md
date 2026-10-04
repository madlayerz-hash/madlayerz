# Correo transaccional (Resend)

Revisado el 10 sep 2026. Re-verificado el 22 sep 2026 en los paneles de Vercel.

## Diagnóstico: hoy no sale ningún correo

1. **`madlayerz.cl` no está verificado en Resend.** En Vercel → Domains → madlayerz.cl los únicos
   registros son tres CAA. No hay TXT (ni DKIM ni SPF) ni MX. Resend sólo permite enviar desde
   dominios verificados. Los nameservers son de Vercel, así que **los registros se agregan ahí
   mismo**.
2. **Faltan las variables de entorno.** En Vercel sólo existen `MERCADOPAGO_ACCESS_TOKEN` (×2),
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   **No hay `RESEND_API_KEY`, `RESEND_FROM` ni `QUOTE_NOTIFICATION_EMAIL`.**
3. **El dominio no tiene MX**, así que `contacto@madlayerz.cl` nunca existió como buzón: lo que le
   escribían rebotaba. Ya se reemplazó por `madlayerz@gmail.com`.

Nota: hay **dos** variables `MERCADOPAGO_ACCESS_TOKEN` en entornos distintos. La de Production es
la que funciona; conviene revisar qué valor tiene la otra.

## Cambios de código aplicados

**10 sep:** `lib/email/resend-client.ts` con remitente configurable por `RESEND_FROM` y el helper
`sendEmailSafely`, que **loguea** el error de Resend — antes un `.catch(() => undefined)` se lo
tragaba, y por eso los correos llevaban meses sin salir sin que nadie lo notara. `/api/quotes`
además valida el body con Zod (antes lo insertaba tal cual).

**22 sep — el correo se movió al momento del pago.** Con Mercado Pago en producción, mandar la
«confirmación» al crear el pedido pasó a ser un bug: quien abandonaba el checkout recibía igual un
correo confirmando algo que nunca pagó.

- `lib/email/paid-order-notification.ts` arma el correo al cliente y el aviso interno leyendo el
  pedido y sus líneas desde la BD. Nunca lanza: un problema de correo no puede hacer que Mercado
  Pago reintente la notificación.
- `confirmMercadoPagoPayment` hace `.select('id')` en el `update` para saber si **esta** llamada
  cambió el estado, y sólo entonces envía.
- `buildOrderConfirmationEmail` acepta `paid: true`: asunto «Pago confirmado» y el cierre deja de
  decir «pendiente de pago».
- `/api/orders` ya no envía nada. 8 tests del builder pasando.

## Checklist pendiente

1. **Resend → Domains → Add domain** `madlayerz.cl`. Copiar los registros DKIM y SPF.
2. **Vercel → Domains → madlayerz.cl → DNS Records**: pegarlos. Verificar en Resend.
3. **Vercel → Settings → Environment Variables** (Production):
   - `RESEND_API_KEY`
   - `QUOTE_NOTIFICATION_EMAIL` = `madlayerz@gmail.com`
   - `RESEND_FROM` = `MadLayerz <notificaciones@madlayerz.cl>`
4. **Redeploy.**
5. Probar una cotización y una compra de prueba.
6. Opcional: para *recibir* correo en `@madlayerz.cl` hay que agregar MX (Google Workspace, Zoho).
