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
