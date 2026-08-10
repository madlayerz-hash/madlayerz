import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadProductImage(client: SupabaseClient, file: File): Promise<string> {
  const path = `${Date.now()}-${file.name}`;

  const { error } = await client.storage.from('product-images').upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = client.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
