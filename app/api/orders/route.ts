import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createOrder, fetchProductNames } from '@/lib/supabase/queries';
import { orderRequestSchema } from '@/lib/validation/order-schema';
import { priceOrder, UnknownProductError, UnknownVariantError } from '@/lib/orders/price-order';
import { calculateShippingCost, type Region } from '@/lib/shipping/shipping-cost';
import { buildOrderConfirmationEmail } from '@/lib/email/order-confirmation';
import { NOTIFICATION_EMAIL, RESEND_FROM, sendEmailSafely } from '@/lib/email/resend-client';

export async function POST(request: Request) {
  const parsed = orderRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const input = parsed.data;
  const client = await createServerSupabaseClient();

  try {
    // Re-price server-side. Totals from the browser are never trusted.
    const { data: rows, error } = await client
      .from('products')
      .select('id, name, price_clp, product_variants ( name )')
      .in('id', input.items.map((item) => item.productId));

    if (error) throw error;

    const catalog = new Map(
      (rows ?? []).map((row: {
        id: string;
        name: string;
        price_clp: number;
        product_variants?: { name: string }[] | null;
      }) => [
        row.id,
        {
          name: row.name,
          priceClp: row.price_clp,
          variantNames: (row.product_variants ?? []).map((v) => v.name),
        },
      ])
    );

    const { items, subtotalClp } = priceOrder(input.items, catalog);
    const shippingCostClp = calculateShippingCost(input.deliveryMethod, input.region as Region | undefined);

    const orderId = await createOrder(client, {
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      deliveryMethod: input.deliveryMethod,
      region: input.region,
      address: input.address,
      shippingCostClp,
      paymentMethod: input.paymentMethod,
      subtotalClp,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceClp: item.unitPriceClp,
        variantName: item.variantName,
      })),
    });

    // Best effort: a mail failure must never lose a placed order.
    void sendOrderEmails({
      orderId,
      input,
      items,
      subtotalClp,
      shippingCostClp,
    }).catch(() => undefined);

    return NextResponse.json({ orderId, subtotalClp, shippingCostClp, totalClp: subtotalClp + shippingCostClp });
  } catch (error) {
    if (error instanceof UnknownProductError) {
      return NextResponse.json(
        { error: 'Uno de los productos de tu carrito ya no está disponible.' },
        { status: 409 }
      );
    }

    if (error instanceof UnknownVariantError) {
      return NextResponse.json(
        { error: 'Uno de los colores de tu carrito ya no está disponible.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function sendOrderEmails({
  orderId,
  input,
  items,
  subtotalClp,
  shippingCostClp,
}: {
  orderId: string;
  input: { customerName: string; customerEmail: string; customerPhone: string; deliveryMethod: 'domicilio' | 'retiro'; region?: string; address?: string };
  items: { name: string; quantity: number; unitPriceClp: number; variantName?: string }[];
  subtotalClp: number;
  shippingCostClp: number;
}) {
  const email = buildOrderConfirmationEmail({
    orderId,
    customerName: input.customerName,
    items,
    subtotalClp,
    shippingCostClp,
    deliveryMethod: input.deliveryMethod,
    region: input.region,
    address: input.address,
  });

  await sendEmailSafely('confirmación de pedido', (resend) =>
    resend.emails.send({
      from: RESEND_FROM,
      to: input.customerEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })
  );

  // Y un aviso para quien tiene que imprimir la pieza.
  if (NOTIFICATION_EMAIL) {
    await sendEmailSafely('aviso interno de pedido', (resend) =>
      resend.emails.send({
        from: RESEND_FROM,
        to: NOTIFICATION_EMAIL,
        replyTo: input.customerEmail,
        subject: `Nuevo pedido #${orderId.slice(0, 8).toUpperCase()} — ${input.customerName}`,
        text: `${input.customerName} (${input.customerEmail}, ${input.customerPhone})\n\n${email.text}`,
      })
    );
  }
}
