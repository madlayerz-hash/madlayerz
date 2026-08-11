-- Fixes Postgres error 42P17 (infinite recursion in RLS): the admin-check
-- policies queried `profiles` from within a policy defined ON `profiles`
-- itself (directly, or via a subquery from another table's policy), which
-- re-triggers profiles' own RLS recursively. A SECURITY DEFINER function
-- bypasses RLS for its internal check, breaking the recursion.

create function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles
drop policy if exists "Admins can read all profiles" on profiles;
create policy "Admins can read all profiles" on profiles
  for select using (is_admin());

-- orders
drop policy if exists "Owners and admins can read orders" on orders;
create policy "Owners and admins can read orders" on orders
  for select using (
    auth.uid() = user_id
    or customer_email = (auth.jwt() ->> 'email')
    or is_admin()
  );

drop policy if exists "Admins can update orders" on orders;
create policy "Admins can update orders" on orders
  for update using (is_admin());

-- order_items
drop policy if exists "Owners and admins can read order items" on order_items;
create policy "Owners and admins can read order items" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
      and (
        auth.uid() = o.user_id
        or o.customer_email = (auth.jwt() ->> 'email')
        or is_admin()
      )
    )
  );

-- quote_requests
drop policy if exists "Admins can read quote requests" on quote_requests;
create policy "Admins can read quote requests" on quote_requests
  for select using (is_admin());

drop policy if exists "Admins can update quote requests" on quote_requests;
create policy "Admins can update quote requests" on quote_requests
  for update using (is_admin());

-- products
drop policy if exists "Admins can insert products" on products;
create policy "Admins can insert products" on products
  for insert with check (is_admin());

drop policy if exists "Admins can update products" on products;
create policy "Admins can update products" on products
  for update using (is_admin());

drop policy if exists "Admins can delete products" on products;
create policy "Admins can delete products" on products
  for delete using (is_admin());

-- categories
drop policy if exists "Admins can insert categories" on categories;
create policy "Admins can insert categories" on categories
  for insert with check (is_admin());

drop policy if exists "Admins can update categories" on categories;
create policy "Admins can update categories" on categories
  for update using (is_admin());

drop policy if exists "Admins can delete categories" on categories;
create policy "Admins can delete categories" on categories
  for delete using (is_admin());

-- storage.objects (product-images bucket)
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin());
