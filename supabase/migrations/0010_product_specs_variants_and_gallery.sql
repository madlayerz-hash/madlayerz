-- Fichas de producto completas, galería de fotos y variantes de color.
--
-- Contexto: hasta acá un producto era nombre + precio + una imagen, y el color
-- sólo podía representarse creando un producto nuevo por cada color. Esta
-- migración agrega (1) los datos que la competencia sí publica —material,
-- medidas, peso, plazo y cuidados—, (2) una galería de fotos adicionales y
-- (3) variantes de color reales, que el cliente elige en la ficha y que quedan
-- registradas en el pedido.

-- 1. Especificaciones y galería -------------------------------------------
alter table products
  add column material text,
  add column dimensions_mm text,
  add column weight_g integer,
  add column production_days text,
  add column care_notes text,
  add column images text[] not null default '{}';

comment on column products.images is 'Fotos adicionales; products.image_url sigue siendo la principal.';

-- 2. Variantes de color ----------------------------------------------------
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  color_hex text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create index product_variants_product_id_idx on product_variants (product_id);

alter table product_variants enable row level security;

create policy "Public read access to product variants" on product_variants
  for select using (true);

create policy "Admins can insert product variants" on product_variants
  for insert with check (is_admin());

create policy "Admins can update product variants" on product_variants
  for update using (is_admin());

create policy "Admins can delete product variants" on product_variants
  for delete using (is_admin());

-- 3. El pedido tiene que registrar qué color pidió el cliente --------------
alter table order_items add column variant_name text;

-- create_order se reemplaza para que arrastre el color de cada línea.
-- El resto del cuerpo es idéntico al de la migración 0006.
create or replace function create_order(input jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_order_id uuid;
  item jsonb;
begin
  insert into orders (
    customer_name, customer_email, customer_phone, delivery_method, region, address,
    shipping_cost_clp, payment_method, status, subtotal_clp, total_clp, user_id
  ) values (
    input->>'customerName',
    input->>'customerEmail',
    input->>'customerPhone',
    input->>'deliveryMethod',
    input->>'region',
    input->>'address',
    (input->>'shippingCostClp')::int,
    input->>'paymentMethod',
    'pendiente_pago',
    (input->>'subtotalClp')::int,
    (input->>'subtotalClp')::int + (input->>'shippingCostClp')::int,
    auth.uid()
  ) returning id into new_order_id;

  for item in select jsonb_array_elements(input->'items')
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_clp, variant_name)
    values (
      new_order_id,
      (item->>'productId')::uuid,
      (item->>'quantity')::int,
      (item->>'unitPriceClp')::int,
      nullif(item->>'variantName', '')
    );
  end loop;

  return new_order_id;
end;
$$;
