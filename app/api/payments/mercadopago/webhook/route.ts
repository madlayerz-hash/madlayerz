import { NextResponse } from 'next/server';
import { confirmMercadoPagoPayment } from '@/lib/payments/mercadopago-server';

/**
 * Mercado Pago avisa aquí cuando cambia un pago. El aviso trae sólo el id: el
 * estado y el monto se vuelven a consultar a Mercado Pago con nuestro token
 * (ver confirmMercadoPagoPayment), así que un aviso inventado no sirve de nada.
 *
 * Soporta los dos formatos que envía: el de webhooks ({ type, data: { id } }) y
 * el antiguo IPN (?topic=payment&id=...).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const type = body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const paymentId = body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');

  if (type !== 'payment' || !paymentId) {
    // Otros eventos (merchant_order, etc.) no nos interesan; se confirma
    // recepción para que no los reintente.
    return NextResponse.json({ received: true });
  }

  try {
    const result = await confirmMercadoPagoPayment(String(paymentId));
    return NextResponse.json({ received: true, orderId: result.orderId, action: result.decision.action });
  } catch (error) {
    console.error('[mercadopago] error procesando la notificación', error);
    // Un 500 hace que Mercado Pago vuelva a intentar más tarde.
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
