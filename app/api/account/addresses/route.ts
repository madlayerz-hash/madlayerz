import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createAddress, deleteAddress } from '@/lib/supabase/queries';
import { addressSchema } from '@/lib/validation/address-schema';

export async function POST(request: Request) {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const id = await createAddress(client, { userId: userData.user.id, ...parsed.data });
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const client = await createServerSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

  await deleteAddress(client, id);
  return NextResponse.json({ ok: true });
}
