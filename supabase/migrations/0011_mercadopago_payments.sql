-- Seguimiento de pagos con Mercado Pago (Checkout Pro).
-- Idempotente: se puede correr aunque alguna columna ya exista.
alter table orders add column if not exists mp_preference_id text;
alter table orders add column if not exists mp_payment_id text;
alter table orders add column if not exists paid_at timestamptz;

-- Un mismo pago de Mercado Pago no puede marcar dos pedidos, ni procesarse dos
-- veces si Mercado Pago reintenta la notificación.
create unique index if not exists orders_mp_payment_id_idx
  on orders (mp_payment_id) where mp_payment_id is not null;
