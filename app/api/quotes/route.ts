import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseClient } from '@/lib/supabase/client';
import { createQuoteRequest, type CreateQuoteRequestInput } from '@/lib/supabase/queries';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateQuoteRequestInput;

  try {
    const id = await createQuoteRequest(createSupabaseClient(), body);

    if (process.env.RESEND_API_KEY && process.env.QUOTE_NOTIFICATION_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'MadLayerz <notificaciones@madlayerz.cl>',
        to: process.env.QUOTE_NOTIFICATION_EMAIL,
        subject: `Nueva cotización de ${body.name}`,
        text: `${body.name} (${body.email}, ${body.phone}) pidió cotización:\n\n${body.description}\n\nCantidad: ${body.quantity}`,
      });
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
