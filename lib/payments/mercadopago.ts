/**
 * Mercado Pago Checkout Pro — la parte pura, sin red ni base de datos, para
 * poder testearla. Las llamadas reales están en mercadopago-server.ts.
 */

export interface PreferenceItemInput {
  name: string;
  quantity: number;
  unitPriceClp: number;
  variantName?: string | null;
}

export interface PreferenceInput {
  orderId: string;
  items: PreferenceItemInput[];
  shippingCostClp: number;
}

export interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: 'CLP';
}

export interface PreferenceBody {
  items: PreferenceItem[];
  external_reference: string;
  back_urls: { success: string; failure: string; pending: string };
  auto_return: 'approved';
  notification_url: string;
  statement_descriptor: string;
}

/**
 * Arma la preferencia a partir de lo que dice la base de datos. El despacho va
 * como una línea más para que el total que cobra Mercado Pago sea exactamente
 * orders.total_clp.
 *
 * No se envía el email del comprador: en modo prueba, Mercado Pago rechaza el
 * pago si ese email no coincide con la cuenta de prueba con que se paga.
 */
export function buildPreferenceBody(input: PreferenceInput, siteUrl: string): PreferenceBody {
  const items: PreferenceItem[] = input.items.map((item, index) => ({
    id: `${input.orderId}-${index + 1}`,
    title: item.variantName ? `${item.name} (${item.variantName})` : item.name,
    quantity: item.quantity,
    unit_price: item.unitPriceClp,
    currency_id: 'CLP',
  }));

  if (input.shippingCostClp > 0) {
    items.push({
      id: `${input.orderId}-despacho`,
      title: 'Despacho',
      quantity: 1,
      unit_price: input.shippingCostClp,
      currency_id: 'CLP',
    });
  }

  const resultUrl = `${siteUrl}/checkout/resultado?orderId=${encodeURIComponent(input.orderId)}`;

  return {
    items,
    external_reference: input.orderId,
    back_urls: { success: resultUrl, failure: resultUrl, pending: resultUrl },
    auto_return: 'approved',
    notification_url: `${siteUrl}/api/payments/mercadopago/webhook`,
    statement_descriptor: 'MADLAYERZ',
  };
}

export function preferenceTotal(body: PreferenceBody): number {
  return body.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

export interface OrderForPayment {
  id: string;
  status: string;
  total_clp: number;
}

export interface MercadoPagoPayment {
  id: number | string;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

export type PaymentDecision =
  | { action: 'mark_paid' }
  | { action: 'ignore'; reason: string }
  | { action: 'reject'; reason: string };

/**
 * Decide qué hacer con un pago. Sólo se marca pagado si Mercado Pago lo da por
 * aprobado, corresponde a este pedido y el monto calza exacto. "reject" es un
 * pago que no debería existir y vale la pena revisar a mano.
 */
export function decidePayment(order: OrderForPayment, payment: MercadoPagoPayment): PaymentDecision {
  if (payment.external_reference !== order.id) {
    return { action: 'reject', reason: 'El pago corresponde a otro pedido.' };
  }

  if (payment.status !== 'approved') {
    return { action: 'ignore', reason: `Pago en estado "${payment.status}".` };
  }

  if (payment.currency_id !== 'CLP') {
    return { action: 'reject', reason: `Moneda inesperada: ${payment.currency_id}.` };
  }

  if (Math.round(payment.transaction_amount) !== order.total_clp) {
    return {
      action: 'reject',
      reason: `Monto pagado ${payment.transaction_amount} distinto al total del pedido ${order.total_clp}.`,
    };
  }

  if (order.status !== 'pendiente_pago') {
    return { action: 'ignore', reason: 'El pedido ya estaba procesado.' };
  }

  return { action: 'mark_paid' };
}
