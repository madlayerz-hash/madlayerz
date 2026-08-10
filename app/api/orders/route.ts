import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createOrder, type CreateOrderInput } from '@/lib/supabase/queries';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateOrderInput;

  try {
    const orderId = await createOrder(await createServerSupabaseClient(), body);
    return NextResponse.json({ orderId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
