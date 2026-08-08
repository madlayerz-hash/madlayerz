alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table quote_requests enable row level security;

create policy "Public read access to categories" on categories
  for select using (true);

create policy "Public read access to products" on products
  for select using (true);

create policy "Public can create orders" on orders
  for insert with check (true);

create policy "Public can create order items" on order_items
  for insert with check (true);

create policy "Public can create quote requests" on quote_requests
  for insert with check (true);
