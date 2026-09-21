import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createQuoteRequest, type CreateQuoteRequestInput } from '@/lib/supabase/queries';
import { quoteRequestSchema } from '@/lib/validation/quote-schema';
import { NOTIFICATION_EMAIL, RESEND_FROM, sendEmailSafely } from '@/lib/email/resend-client';

export async function POST(request: Request) {
  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const body = parsed.data as CreateQuoteRequestInput;

  try {
    const id = await createQuoteRequest(await createServerSupabaseClient(), body);

    const notifyTo = NOTIFICATION_EMAIL;
    if (notifyTo) {
      void sendEmailSafely('cotización', (resend) =>
        resend.emails.send({
          from: RESEND_FROM,
          to: notifyTo,
          replyTo: body.email,
          subject: `Nueva cotización de ${body.name}`,
          text: `${body.name} (${body.email}, ${body.phone}) pidió cotización:\n\n${body.description}\n\nCantidad: ${body.quantity}${
            body.budgetClp ? `\nPresupuesto: $${body.budgetClp.toLocaleString('es-CL')}` : ''
          }\n\nVer en el panel: /admin/cotizaciones`,
        })
      );
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
