# Diseño: Integración de pago real con Flow

**Fecha:** 2026-08-11
**Estado:** Aprobado, pendiente de plan de implementación

## Contexto

El checkout de MadLayerz tiene un paso de "método de pago" (Flow o Mercado Pago) pero el pago
es simulado: el pedido se crea con `status='pendiente_pago'` y no se procesa ningún cobro real.
Este diseño reemplaza esa simulación con un cobro real vía **Flow** (pasarela chilena), dejando
Mercado Pago visible pero deshabilitado para una fase futura.

Decisiones ya tomadas con el usuario:
- Empezamos con **Flow únicamente**. Mercado Pago queda en el selector, deshabilitado ("Próximamente").
- Flujo de **redirect completo** a Flow (no iframe/modal embebido).
- El **carrito se vacía solo cuando el pago se confirma** (`status='pagado'`), no al crear el pedido.
- Empezamos contra el **ambiente sandbox** de Flow; se cambia a producción vía env vars cuando el usuario cree la cuenta comercial real.
- El estado de la orden se actualiza **solo vía el webhook de Flow**, corriendo server-side con `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS), nunca desde código de cliente.
- El usuario ya aplicó manualmente los cambios de base de datos de la sección 1 en el SQL Editor de Supabase — el archivo de migración en el repo documenta ese estado para que quede en el historial versionado.

## 1. Base de datos

Migración `supabase/migrations/0009_flow_payments.sql` (ya aplicada manualmente por el usuario en producción; el archivo se agrega al repo para dejar el historial de migraciones consistente):

```sql
alter table orders
  add column flow_token text,
  add column flow_order_number bigint,
  add column paid_at timestamptz;

create unique index orders_flow_token_idx on orders (flow_token) where flow_token is not null;
```

- `flow_token`: token que Flow entrega al crear el pago; se usa para verificar el webhook contra
  la API de Flow (fuente de verdad) y para buscar la orden correspondiente cuando llega el webhook.
- `flow_order_number`: el `commerceOrder` (id de la orden) enviado a Flow, para logs/soporte.
- `paid_at`: timestamp de confirmación real del pago.
- El índice único parcial evita procesar dos veces el mismo token si Flow reintenta el webhook
  (colisión de índice = ya existe, tratamos como ya-procesado).

No se modifica RLS: las rutas que tocan `orders.status` para pagos corren con el service-role key,
igual patrón que `supabase/seed.ts` ya usa hoy.

## 2. Rutas API nuevas

### `POST /api/payments/flow/create`
Server-side, llamado por el checkout inmediatamente después de crear el pedido.

- Body: `{ orderId: string }`.
- Lee la orden con el cliente service-role (no depende de sesión — cubre checkout de invitado).
- Rechaza (400) si `status !== 'pendiente_pago'` o si la orden ya tiene `flow_token` (evita
  generar dos pagos para el mismo pedido).
- Arma los parámetros de Flow: `commerceOrder=orderId`, `subject="Pedido MadLayerz #<orderId>"`,
  `currency=CLP`, `amount=total_clp`, `email=customer_email`,
  `urlConfirmation=<APP_URL>/api/payments/flow/webhook`,
  `urlReturn=<APP_URL>/checkout/resultado?orderId=<orderId>`.
- Firma la petición: concatena `apiKey` + parámetros ordenados alfabéticamente por nombre de
  parámetro, firma con HMAC-SHA256 usando `FLOW_SECRET_KEY` (algoritmo documentado por Flow),
  llama `POST {FLOW_API_URL}/payment/create`.
- Guarda `flow_token` y `flow_order_number` en la orden.
- Devuelve `{ url: "${flowRedirectUrl}?token=${token}" }` al cliente.

### `POST /api/payments/flow/webhook`
Llamado por los servidores de Flow (`urlConfirmation`), sin sesión de usuario — endpoint público
pero verificado.

- Content-Type `application/x-www-form-urlencoded` (formato Flow), lee `token` del body.
- **Nunca confía en datos entrantes del body más allá del token.** Vuelve a llamar
  `GET {FLOW_API_URL}/payment/getStatus?token=...` (firmado con `FLOW_SECRET_KEY`) para obtener
  el estado real y autoritativo del pago.
- Busca la orden por `flow_token` (no por `commerceOrder` del payload, para no confiar en datos
  que el llamante controla).
- Mapea el status numérico de Flow:
  - `2` (pagado) → `orders.status='pagado'`, `paid_at=now()`.
  - `3` (rechazado) o `4` (anulado) → `orders.status='cancelado'`.
  - `1` (pendiente) → no-op, no se actualiza nada.
- Idempotencia: si la orden ya está en `status='pagado'`, responde 200 sin reprocesar.
- Responde siempre `200` rápidamente (Flow reintenta el webhook si no recibe 200), incluso cuando
  el resultado mapeado fue "sigue pendiente".
- Si no encuentra la orden por `flow_token`, responde 200 igual (evita reintentos infinitos de
  Flow por un token que nunca vamos a poder resolver) pero loggea el caso.

### `GET /api/orders/[id]/status`
Leído por la pantalla de resultado del checkout, sin autenticación (el `orderId` es un UUID no
adivinable, mismo nivel de exposición que hoy tiene `ConfirmationScreen` con el orderId visible).

- Devuelve solo `{ status, totalClp }` vía cliente service-role — sin PII del cliente.

## 3. Checkout UI

- **`components/checkout/PaymentStep.tsx`**: quita el texto de "el pago no se procesa realmente".
  Mercado Pago queda en la lista con `disabled` en el radio y una etiqueta "(Próximamente)".
- **`app/checkout/page.tsx`**: `handlePaymentConfirm` deja de vaciar el carrito y de pasar a
  `step='done'` directamente. Nuevo flujo:
  1. `POST /api/orders` (sin cambios, crea con `status='pendiente_pago'`).
  2. `POST /api/payments/flow/create { orderId }`.
  3. `window.location.href = url` de Flow.
  - Si el paso 2 falla, se muestra un error en el mismo paso de pago y el usuario puede
    reintentar sin perder los datos de envío/entrega ya ingresados (no se resetea el wizard).
- **Nueva página `app/checkout/resultado/page.tsx`** (Client Component, reemplaza el uso directo
  de `step='done'` + `ConfirmationScreen` dentro del wizard): lee `orderId` de la query string,
  hace polling a `GET /api/orders/[id]/status` cada 2s, máximo 8 intentos (~16s):
  - `pagado` → detiene el polling, vacía el carrito (`useCartStore.clear()`), muestra
    `ConfirmationScreen` de éxito.
  - `cancelado` → detiene el polling, muestra mensaje de pago fallido + botón "Volver a
    intentar" que lleva a `/checkout` (el pedido queda con status `cancelado`, no se reutiliza).
  - Se acaba el polling sin resolución (sigue `pendiente_pago`) → mensaje "Estamos confirmando tu
    pago, te avisaremos por email" (cubre el caso borde de que el webhook de Flow tarde más que
    el redirect del navegador del usuario).

## 4. Variables de entorno nuevas

`FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL` (sandbox: `https://sandbox.flow.cl/api`;
producción: `https://www.flow.cl/api`). Se confirma también que `SUPABASE_SERVICE_ROLE_KEY` (ya
documentada en `.env.local.example`) esté configurada en Vercel. Ninguna credencial se pide ni se
usa hasta la fase de prueba contra sandbox real — el usuario debe crear la cuenta de Flow y
pegar las keys en las variables de entorno de Vercel (nunca en el código).

## 5. Testing

- Unit test de la función de firma HMAC de Flow (pura, sin red): dado un set de parámetros y una
  secret key fija, produce la firma esperada.
- Unit test del mapeo de estado Flow → `orders.status` (los 4 casos: pendiente/pagado/rechazado/anulado).
- Unit test de idempotencia del webhook: token ya procesado (orden ya `pagado`) no reprocesa ni
  duplica `paid_at`.
- Unit test de `PaymentStep` con Mercado Pago deshabilitado (no seleccionable).
- Las llamadas reales a la API de Flow (`payment/create`, `payment/getStatus`) se mockean en los
  tests automatizados. La prueba end-to-end contra el sandbox real de Flow se hace manualmente
  cuando el usuario tenga las credenciales sandbox configuradas en `.env.local`.

## Fuera de alcance (explícitamente)

- Integración de Mercado Pago (fase futura).
- Reembolsos / devoluciones de pago.
- Reintentos automáticos de pago sin pasar por un nuevo pedido.
- Notificaciones por email de confirmación de pago (ya existe contacto por email/WhatsApp manual
  mencionado en `ConfirmationScreen`; no se agrega envío automático en este alcance).
