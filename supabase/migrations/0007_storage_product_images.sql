insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admins can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admins can delete product images" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
