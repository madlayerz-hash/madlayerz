import { createAdminSupabaseClient } from '@/lib/supabase/admin-client';
import {
  decidePayment,
  type MercadoPagoPayment,
  type PaymentDecision,
  type PreferenceBody,
} from './mercadopago';

const MP_API = 'https://api.mercadopago.com';

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno de Vercel.');
  return token;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export async function createPreference(
  body: PreferenceBody,
  idempotencyKey: string
): Promise<{ id: string; initPoint: string }> {
  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      // Reintentar con la misma clave no crea una segunda preferencia.
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.init_point) {
    throw new Error(`Mercado Pago rechazó la preferencia (${response.status}): ${data.message ?? 'sin detalle'}`);
  }

  return { id: String(data.id), initPoint: String(data.init_point) };
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const response = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudo consultar el pago ${paymentId} (${response.status}).`);
  }

  return (await response.json()) as MercadoPagoPayment;
}

export interface ConfirmResult {
  orderId: string | null;
  decision: PaymentDecision | { action: 'not_found' };
}

/**
 * Fuente de verdad: siempre se vuelve a consultar el pago en Mercado Pago con
 * nuestro token. Por eso una notificación falsa no puede marcar un pedido como
 * pagado — el estado y el monto vienen de Mercado Pago, no del mensaje.
 *
 * Se usa tanto desde el webhook como al volver del checkout, así el pedido
 * queda pagado aunque la notificación se atrase.
 */
export async function confirmMercadoPagoPayment(paymentId: string): Promise<ConfirmResult> {
  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference;

  if (!orderId) return { orderId: null, decision: { action: 'not_found' } };

  const admin = createAdminSupabaseClient();
  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, total_clp')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  if (!order) return { orderId, decision: { action: 'not_found' } };

  const decision = decidePayment(order as { id: string; status: string; total_clp: number }, payment);

  if (decision.action === 'mark_paid') {
    // La condición sobre status hace que dos confirmaciones simultáneas (webhook
    // y retorno del cliente) no pisen nada: sólo la primera actualiza.
    const { error: updateError } = await admin
      .from('orders')
      .update({ status: 'pagado', paid_at: new Date().toISOString(), mp_payment_id: String(payment.id) })
      .eq('id', orderId)
      .eq('status', 'pendiente_pago');

    if (updateError) throw updateError;
  }

  if (decision.action === 'reject') {
    console.error(`[mercadopago] pago ${payment.id} para el pedido ${orderId}: ${decision.reason}`);
  }

  return { orderId, decision };
}
