import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { productAdminSchema } from '@/lib/validation/product-admin-schema';
import { updateProduct } from '@/lib/supabase/queries';
import { PLACEHOLDER_IMAGE } from '@/lib/site';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** The storefront is cached; a write here has to expire the pages that show it. */
function revalidateStorefront(slug?: string) {
  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/producto/${slug}`);
}

export async function POST(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  const parsed = productAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const slug = `${slugify(parsed.data.name)}-${Date.now()}`;

  const { error } = await client.from('products').insert({
    slug,
    name: parsed.data.name,
    description: parsed.data.description,
    price_clp: parsed.data.priceClp,
    category_id: parsed.data.categoryId,
    image_url: body.imageUrl || PLACEHOLDER_IMAGE,
    featured: parsed.data.featured,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateStorefront(slug);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  if (!body?.id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  const parsed = productAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  try {
    await updateProduct(client, body.id as string, { ...parsed.data, imageUrl: body.imageUrl || undefined });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  revalidateStorefront(typeof body.slug === 'string' ? body.slug : undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  // A product referenced by an existing order cannot be deleted (FK), and
  // shouldn't be: it would rewrite order history. Hide it from the storefront
  // instead of failing with a raw Postgres error.
  const { count } = await client
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Este producto ya aparece en pedidos, así que no se puede eliminar. Edítalo o quítale "Destacado".' },
      { status: 409 }
    );
  }

  const { data: existing } = await client.from('products').select('slug').eq('id', id).maybeSingle();

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateStorefront((existing as { slug?: string } | null)?.slug);
  return NextResponse.json({ ok: true });
}
