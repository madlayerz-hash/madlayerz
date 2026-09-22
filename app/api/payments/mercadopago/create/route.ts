import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin-client';
import { buildPreferenceBody, preferenceTotal } from '@/lib/payments/mercadopago';
import { createPreference, isMercadoPagoConfigured } from '@/lib/payments/mercadopago-server';
import { SITE_URL } from '@/lib/site';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderLine {
  quantity: number;
  unit_price_clp: number;
  variant_name: string | null;
  products: { name: string } | null;
}

/**
 * Crea el cobro en Mercado Pago para un pedido ya registrado y devuelve la URL
 * a la que hay que mandar al cliente. Todo el monto sale de la base de datos:
 * el navegador sólo aporta el id del pedido.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';

  if (!UUID.test(orderId)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ error: 'El pago con Mercado Pago no está disponible en este momento.' }, { status: 503 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, status, shipping_cost_clp, total_clp')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: 'No encontramos el pedido.' }, { status: 404 });

    if (order.status !== 'pendiente_pago') {
      return NextResponse.json({ error: 'Este pedido ya no está pendiente de pago.' }, { status: 409 });
    }

    const { data: lines, error: linesError } = await admin
      .from('order_items')
      .select('quantity, unit_price_clp, variant_name, products ( name )')
      .eq('order_id', orderId);

    if (linesError) throw linesError;

    const preference = buildPreferenceBody(
      {
        orderId,
        shippingCostClp: order.shipping_cost_clp as number,
        items: ((lines ?? []) as unknown as OrderLine[]).map((line) => ({
          name: line.products?.name ?? 'Producto MadLayerz',
          quantity: line.quantity,
          unitPriceClp: line.unit_price_clp,
          variantName: line.variant_name,
        })),
      },
      SITE_URL
    );

    // Si esto no calza, algo quedó mal guardado: mejor no cobrar.
    if (preferenceTotal(preference) !== order.total_clp) {
      console.error(`[mercadopago] total inconsistente en el pedido ${orderId}`);
      return NextResponse.json({ error: 'No pudimos preparar el pago de este pedido.' }, { status: 500 });
    }

    const { id, initPoint } = await createPreference(preference, `order-${orderId}`);

    await admin
      .from('orders')
      .update({ mp_preference_id: id, payment_method: 'mercadopago' })
      .eq('id', orderId);

    return NextResponse.json({ url: initPoint });
  } catch (error) {
    console.error('[mercadopago] error al crear el cobro', error);
    return NextResponse.json({ error: 'No pudimos conectar con Mercado Pago. Inténtalo de nuevo.' }, { status: 502 });
  }
}
