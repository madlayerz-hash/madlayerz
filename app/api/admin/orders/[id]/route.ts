import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';

const VALID_STATUSES = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json();
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { error } = await client.from('orders').update({ status: body.status }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
