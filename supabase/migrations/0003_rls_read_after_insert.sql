create policy "Public can read orders" on orders
  for select using (true);

create policy "Public can read order items" on order_items
  for select using (true);

create policy "Public can read quote requests" on quote_requests
  for select using (true);
