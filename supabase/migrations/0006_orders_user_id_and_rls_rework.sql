alter table orders add column user_id uuid references auth.users(id);

-- Replace the Fase-1 public-read policies (from 0002/0003) with owner/admin-only reads.
drop policy if exists "Public can read orders" on orders;
drop policy if exists "Public can read order items" on order_items;
drop policy if exists "Public can read quote requests" on quote_requests;
drop policy if exists "Public can create orders" on orders;
drop policy if exists "Public can create order items" on order_items;
drop policy if exists "Public can create quote requests" on quote_requests;

create policy "Owners and admins can read orders" on orders
  for select using (
    auth.uid() = user_id
    or customer_email = (auth.jwt() ->> 'email')
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update orders" on orders
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Owners and admins can read order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and (
        auth.uid() = o.user_id
        or o.customer_email = (auth.jwt() ->> 'email')
        or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
      )
    )
  );

create policy "Admins can read quote requests" on quote_requests
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update quote requests" on quote_requests
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Product/category writes: admin-only (SELECT stays public from Fase 1's 0002 policy).
create policy "Admins can insert products" on products
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update products" on products
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete products" on products
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can insert categories" on categories
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can update categories" on categories
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete categories" on categories
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- SECURITY DEFINER creation functions: bypass the now-restricted SELECT/INSERT
-- policies internally, expose only the new row's id to the caller (anon or authed).
create function create_order(input jsonb)
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
    insert into order_items (order_id, product_id, quantity, unit_price_clp)
    values (new_order_id, (item->>'productId')::uuid, (item->>'quantity')::int, (item->>'unitPriceClp')::int);
  end loop;

  return new_order_id;
end;
$$;

create function create_quote_request(input jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_quote_id uuid;
begin
  insert into quote_requests (name, email, phone, description, quantity, budget_clp, reference_image_url, status)
  values (
    input->>'name',
    input->>'email',
    input->>'phone',
    input->>'description',
    (input->>'quantity')::int,
    nullif(input->>'budgetClp', '')::int,
    input->>'referenceImageUrl',
    'nueva'
  ) returning id into new_quote_id;

  return new_quote_id;
end;
$$;
