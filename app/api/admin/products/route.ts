import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { productAdminSchema } from '@/lib/validation/product-admin-schema';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  const parsed = productAdminSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { error } = await client.from('products').insert({
    slug: `${slugify(parsed.data.name)}-${Date.now()}`,
    name: parsed.data.name,
    description: parsed.data.description,
    price_clp: parsed.data.priceClp,
    category_id: parsed.data.categoryId,
    image_url: body.imageUrl ?? '/products/placeholder.svg',
    featured: parsed.data.featured,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
