# Pagos con Mercado Pago (Checkout Pro)

Estado: **funcionando en producción con credenciales de prueba.** Compra de prueba aprobada y
verificada de punta a punta el 22 sep 2026. Flow queda visible en el checkout como «Próximamente».

## Costos (verificado 22 sep 2026)

Sin activación ni mensualidad. Mercado Pago: 3,19 % dinero al instante o 2,89 % a 10 días, IVA
aparte. Flow: 2,89 % + IVA (abono día 3) o 3,19 % + IVA (día siguiente); reembolso $202 + IVA.

## Flujo

1. El checkout crea el pedido (`/api/orders`, precios recalculados en servidor) → `pendiente_pago`.
2. `POST /api/payments/mercadopago/create {orderId}` arma la preferencia **desde la BD** (líneas +
   despacho = `orders.total_clp`, se verifica antes de cobrar) y devuelve `init_point`.
3. El cliente paga en Mercado Pago y vuelve a `/checkout/resultado?orderId=…`.
4. `POST /api/payments/mercadopago/webhook` y la página de resultado llaman a
   `confirmMercadoPagoPayment(paymentId)`: consulta el pago a Mercado Pago con nuestro token y
   marca `pagado` sólo si está aprobado, es del pedido correcto, en CLP y por el monto exacto.
   Un aviso falso no sirve porque el estado nunca se toma del mensaje.
5. El `update` lleva `.eq('status','pendiente_pago').select('id')`: sólo la llamada que gana la
   carrera actualiza y manda el correo.
6. El carrito se vacía recién cuando el pedido figura pagado.

Si Mercado Pago falla después de crear el pedido, el reintento reutiliza el mismo pedido.

## Archivos

`lib/payments/mercadopago.ts` (puro, testeado), `lib/payments/mercadopago-server.ts`,
`lib/supabase/admin-client.ts` (service role, sólo servidor),
`app/api/payments/mercadopago/{create,webhook}/route.ts`, `app/checkout/resultado/`,
`supabase/migrations/0011_mercadopago_payments.sql`.

## Variables en Vercel

- `MERCADOPAGO_ACCESS_TOKEN` — token **de prueba**, sólo en Production.
- `SUPABASE_SERVICE_ROLE_KEY` — necesaria para el webhook y la compra como invitado.

Recordatorio: Vercel **no aplica una variable editada a un deploy ya en línea**. Después de
editarla hay que hacer Redeploy.

## Prueba de aceptación (22 sep 2026)

Compra por $12.900 con Mastercard de prueba de Chile (`5416 7526 0258 2580`, CVV 123, 11/30,
titular `APRO`, RUT `12345678-5`). Logs de Vercel: `POST 200 /api/payments/mercadopago/webhook` →
`GET 200 /checkout/resultado`. El pedido quedó en **pagado** en el panel de admin.

Las tarjetas de prueba son **por país**: la Visa genérica de Argentina (`4023…`) es rechazada en
Chile, y reintentarla gatilla el límite de intentos de la tarjeta (hay que empezar un checkout
nuevo para generar otra preferencia).

## Errores resueltos en el camino

- **403 «At least one policy returned UNAUTHORIZED»** al crear la preferencia: se había cargado el
  Public Key en vez del Access Token. Ambos empiezan con `APP_USR-`; el Access Token es mucho más
  largo.
- El checkout no enviaba `variantName` a `/api/orders`: los pedidos quedaban sin color.

## Pendientes

- **Credenciales de producción**: hoy un comprador real no puede pagar. Misma variable + Redeploy.
  Antes: boleta electrónica resuelta.
- **Nombre del negocio en Mercado Pago**: la pantalla de pago dice «te llevaremos a .» porque el
  nombre de la tienda está vacío en el panel de MP.
- **Flow**: aún sin implementar.
