-- =====================================================================
--  MadLayerz — instalación del catálogo real, en un solo paso
--  Supabase → SQL Editor → pegar todo esto → Run
--
--  Hace dos cosas:
--    A) la migración 0010 (ficha técnica, galería y variantes de color)
--    B) carga los 10 productos con sus fotos y colores
--
--  Es idempotente: se puede correr de nuevo sin romper nada ni duplicar.
--  Requisito: las fotos ya tienen que estar publicadas en el sitio
--  (public/products/*.jpg entra a producción con el próximo deploy).
-- =====================================================================


-- =========================  A. ESTRUCTURA  ===========================

-- A.1 Ficha técnica y galería en products ------------------------------
alter table products add column if not exists material text;
alter table products add column if not exists dimensions_mm text;
alter table products add column if not exists weight_g integer;
alter table products add column if not exists production_days text;
alter table products add column if not exists care_notes text;
alter table products add column if not exists images text[] not null default '{}';

comment on column products.images is 'Fotos adicionales; products.image_url sigue siendo la principal.';

-- A.2 Variantes de color ----------------------------------------------
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  color_hex text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create index if not exists product_variants_product_id_idx on product_variants (product_id);

alter table product_variants enable row level security;

drop policy if exists "Public read access to product variants" on product_variants;
create policy "Public read access to product variants" on product_variants
  for select using (true);

drop policy if exists "Admins can insert product variants" on product_variants;
create policy "Admins can insert product variants" on product_variants
  for insert with check (is_admin());

drop policy if exists "Admins can update product variants" on product_variants;
create policy "Admins can update product variants" on product_variants
  for update using (is_admin());

drop policy if exists "Admins can delete product variants" on product_variants;
create policy "Admins can delete product variants" on product_variants
  for delete using (is_admin());

-- A.3 El pedido registra qué color pidió el cliente --------------------
alter table order_items add column if not exists variant_name text;

-- create_order se reemplaza para arrastrar el color de cada línea.
-- El resto del cuerpo es idéntico al de la migración 0006.
create or replace function create_order(input jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $fn$
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
$fn$;


-- =========================  B. CATÁLOGO  =============================
-- Precios propuestos según la competencia chilena, NO calculados sobre
-- tus costos. Cámbialos acá antes de correr, o después en /admin/productos.

-- B.1 Categorías -------------------------------------------------------
insert into categories (slug, name) values
  ('llaveros',            'Llaveros'),
  ('figuras-personajes',  'Figuras de Personajes'),
  ('figuras-decorativas', 'Figuras Decorativas'),
  ('maceteros',           'Maceteros'),
  ('juguetes',            'Juguetes'),
  ('hogar',               'Hogar y Organización')
on conflict (slug) do update set name = excluded.name;

-- B.2 Productos --------------------------------------------------------
insert into products (
  slug, name, description, price_clp, category_id, image_url, images, featured,
  material, dimensions_mm, weight_g, production_days, care_notes
) values

  ('llavero-calavera-glow',
   'Llavero Calavera Fosforescente',
   'Calavera con cresta impresa en PLA fosforescente: se carga con la luz del día y brilla en la oscuridad durante varias horas. Viene con argolla metálica lista para usar.',
   3500,
   (select id from categories where slug = 'llaveros'),
   '/products/llavero-calavera-glow-1.jpg',
   array['/products/llavero-calavera-glow-2.jpg'],
   true,
   'PLA fosforescente', '45 × 25 × 22 mm', 8, '3 a 5 días hábiles',
   'Déjalo unos minutos bajo una luz para que brille más fuerte. Evita el agua caliente y la exposición prolongada al sol.'),

  ('calavera-arcoiris',
   'Calavera Arcoíris',
   'Calavera anatómica de tamaño mediano, pintada a mano en degradado rojo, amarillo y verde con acabado escarchado. Cada pieza queda distinta: el degradado se aplica a mano, así que no hay dos iguales.',
   24900,
   (select id from categories where slug = 'figuras-decorativas'),
   '/products/calavera-arcoiris-1.jpg',
   array['/products/calavera-arcoiris-2.jpg', '/products/calavera-arcoiris-3.jpg'],
   true,
   'PLA con pintura acrílica y purpurina', '130 × 95 × 100 mm aprox.', 180,
   '7 a 10 días hábiles (incluye el pintado a mano)',
   'Sólo limpieza en seco con un paño suave: la pintura no resiste agua caliente ni solventes.'),

  ('busto-rostro-envuelto',
   'Busto Rostro Envuelto',
   'Escultura de un rostro envuelto en cintas en espiral, impresa en una sola pieza. Se ve distinta desde cada ángulo, así que funciona bien sobre un escritorio o una repisa donde se pueda mirar de cerca.',
   12900,
   (select id from categories where slug = 'figuras-decorativas'),
   '/products/busto-rostro-1.jpg',
   array['/products/busto-rostro-bicolor.jpg'],
   true,
   'PLA', '150 × 85 × 85 mm aprox.', 120, '5 a 7 días hábiles',
   'Límpiala con un paño seco. No la dejes al sol directo ni dentro de un auto cerrado.'),

  ('dama-clasica',
   'Figura Dama Clásica',
   'Figura femenina de estilo clásico, con el vestido y el peinado trabajados en detalle. Mide poco más de un palmo, así que cabe en cualquier repisa.',
   8900,
   (select id from categories where slug = 'figuras-decorativas'),
   '/products/dama-clasica-rosado.jpg',
   array[]::text[],
   false,
   'PLA', '115 × 40 × 35 mm aprox.', 55, '4 a 6 días hábiles', null),

  ('maceta-flores',
   'Maceta con Flores',
   'Maceta con tres flores impresas en rojo, azul y amarillo sobre tallos verdes. No se riega, no se marchita y no necesita luz: es un ramo que dura. Las flores salen del tallo, así que puedes cambiarlas de posición.',
   11900,
   (select id from categories where slug = 'maceteros'),
   '/products/maceta-flores-1.jpg',
   array[]::text[],
   true,
   'PLA', 'Maceta 70 mm de alto · conjunto armado 160 mm', 95, '5 a 7 días hábiles', null),

  ('hipopotamo-marmol',
   'Hipopótamo Mármol',
   'Hipopótamo en miniatura impreso en filamento con efecto mármol: el moteado gris viene en el material, no está pintado, así que no se despinta nunca. Del porte de una moneda de cien.',
   3900,
   (select id from categories where slug = 'figuras-decorativas'),
   '/products/hipopotamo-marmol-1.jpg',
   array[]::text[],
   false,
   'PLA efecto mármol', '38 × 22 × 18 mm', 9, '3 a 5 días hábiles', null),

  ('caja-regalo-decorativa',
   'Caja de Regalo Decorativa',
   'Caja con cinta y moño impresos en rojo sobre blanco. Se abre y guarda algo pequeño adentro, así que sirve igual como envoltorio reutilizable o como adorno de repisa.',
   9900,
   (select id from categories where slug = 'hogar'),
   '/products/caja-regalo-1.jpg',
   array[]::text[],
   false,
   'PLA', '95 × 95 × 110 mm', 110, '5 a 7 días hábiles', null),

  ('ocarina-6-agujeros',
   'Ocarina de 6 Agujeros',
   'Ocarina funcional de seis agujeros, afinada y lista para tocar. Se toca igual que una de cerámica, pero no se quiebra si se cae. Acabado metalizado morado.',
   9900,
   (select id from categories where slug = 'juguetes'),
   '/products/ocarina-1.jpg',
   array[]::text[],
   true,
   'PLA metalizado', '95 × 65 × 40 mm', 60, '4 a 6 días hábiles',
   'Enjuágala con agua fría después de tocarla y déjala secar al aire. Nunca con agua caliente.'),

  ('frasco-texturizado',
   'Frasco Texturizado con Tapa',
   'Frasco con tapa a rosca y textura de diamante en todo el cuerpo, que de paso le da agarre. Para clips, audífonos, semillas o lo que sea. La rosca es impresa: no lleva ninguna pieza extra.',
   8900,
   (select id from categories where slug = 'hogar'),
   '/products/frasco-texturizado-1.jpg',
   array['/products/frasco-texturizado-2.jpg'],
   false,
   'PLA', '80 mm de alto × 70 mm de diámetro', 85, '4 a 6 días hábiles',
   'No es hermético ni apto para alimentos ni para lavavajillas.'),

  ('figura-articulada-mascota',
   'Figura Articulada Mascota',
   'Figura articulada impresa en varios colores y armada a mano. Los brazos, las piernas y la cabeza se mueven, así que se puede posar de distintas maneras.',
   14900,
   (select id from categories where slug = 'juguetes'),
   '/products/figura-articulada-1.jpg',
   array[]::text[],
   false,
   'PLA multicolor', '140 mm de alto aprox.', 90, '7 a 10 días hábiles', null)

on conflict (slug) do update set
  name            = excluded.name,
  description     = excluded.description,
  price_clp       = excluded.price_clp,
  category_id     = excluded.category_id,
  image_url       = excluded.image_url,
  images          = excluded.images,
  featured        = excluded.featured,
  material        = excluded.material,
  dimensions_mm   = excluded.dimensions_mm,
  weight_g        = excluded.weight_g,
  production_days = excluded.production_days,
  care_notes      = excluded.care_notes;

-- B.3 Variantes de color ----------------------------------------------
-- Se reemplazan en bloque para que correr esto dos veces no duplique.
delete from product_variants
where product_id in (
  select id from products where slug in ('busto-rostro-envuelto', 'dama-clasica')
);

insert into product_variants (product_id, name, color_hex, image_url, sort_order)
select p.id, v.name, v.color_hex, v.image_url, v.sort_order
from products p
join (values
  ('busto-rostro-envuelto', 'Negro',         '#1C1C1C', '/products/busto-rostro-negro.jpg',   0),
  ('busto-rostro-envuelto', 'Verde',         '#2FB63F', '/products/busto-rostro-verde.jpg',   1),
  ('busto-rostro-envuelto', 'Verde y negro', '#2FB63F', '/products/busto-rostro-bicolor.jpg', 2),
  ('dama-clasica',          'Rosado',        '#F5849B', '/products/dama-clasica-rosado.jpg',  0),
  ('dama-clasica',          'Verde',         '#3AA93A', '/products/dama-clasica-verde.jpg',   1)
) as v(slug, name, color_hex, image_url, sort_order)
  on v.slug = p.slug;


-- =========================  C. VERIFICACIÓN  =========================
-- Debería devolver 10 productos, y 3 y 2 variantes en los dos que las tienen.
select p.slug, p.name, p.price_clp, count(v.id) as variantes
from products p
left join product_variants v on v.product_id = p.id
where p.slug in (
  'llavero-calavera-glow', 'calavera-arcoiris', 'busto-rostro-envuelto', 'dama-clasica',
  'maceta-flores', 'hipopotamo-marmol', 'caja-regalo-decorativa', 'ocarina-6-agujeros',
  'frasco-texturizado', 'figura-articulada-mascota'
)
group by p.slug, p.name, p.price_clp
order by p.name;
