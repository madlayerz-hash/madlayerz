import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { updateQuoteStatus } from '@/lib/supabase/queries';

export const QUOTE_STATUSES = ['nueva', 'en_proceso', 'cotizada', 'aceptada', 'cerrada'] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const client = await createServerSupabaseClient();

  const body = await request.json().catch(() => null);
  if (!QUOTE_STATUSES.includes(body?.status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  try {
    await updateQuoteStatus(client, params.id, body.status);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
