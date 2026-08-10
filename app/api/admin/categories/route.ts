import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { categoryAdminSchema } from '@/lib/validation/category-admin-schema';

export async function POST(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  const parsed = categoryAdminSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { error } = await client.from('categories').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  const { count, error: countError } = await client.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if (count && count > 0) {
    return NextResponse.json({ error: 'No se puede eliminar: hay productos en esta categoría.' }, { status: 400 });
  }

  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
