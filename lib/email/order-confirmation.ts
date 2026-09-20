import { SITE_NAME, SITE_URL, formatClp } from '@/lib/site';

export interface OrderEmailItem {
  name: string;
  quantity: number;
  unitPriceClp: number;
  /** Color elegido, cuando el producto tiene variantes. */
  variantName?: string;
}

/** "Busto Rostro (Verde)" — el color va en la línea o el cliente no sabe qué pidió. */
function lineName(item: OrderEmailItem): string {
  return item.variantName ? `${item.name} (${item.variantName})` : item.name;
}

export interface OrderEmailInput {
  orderId: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotalClp: number;
  shippingCostClp: number;
  deliveryMethod: 'domicilio' | 'retiro';
  region?: string | null;
  address?: string | null;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Pure builder so the wording can be tested without touching Resend.
 * The order total is recomputed here from the line items rather than trusted
 * from the client payload.
 */
export function buildOrderConfirmationEmail(input: OrderEmailInput): BuiltEmail {
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  const totalClp = input.subtotalClp + input.shippingCostClp;

  const deliveryLine =
    input.deliveryMethod === 'retiro'
      ? 'Retiro coordinado (te escribimos para acordar día y hora).'
      : `Envío a domicilio: ${[input.address, input.region].filter(Boolean).join(', ')}`;

  const lines = input.items.map(
    (item) => `${item.quantity} × ${lineName(item)} — ${formatClp(item.unitPriceClp * item.quantity)}`
  );

  const text = [
    `¡Gracias por tu pedido, ${input.customerName}!`,
    '',
    `Pedido #${shortId}`,
    '',
    ...lines,
    '',
    `Subtotal: ${formatClp(input.subtotalClp)}`,
    `Despacho: ${formatClp(input.shippingCostClp)}`,
    `Total: ${formatClp(totalClp)}`,
    '',
    deliveryLine,
    '',
    'Tu pedido queda como pendiente de pago. Te contactamos por email o WhatsApp para coordinar el cobro y la entrega.',
    '',
    `${SITE_NAME} — ${SITE_URL}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f6f7f6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#14532d">¡Gracias por tu pedido, ${escapeHtml(input.customerName)}!</h1>
    <p style="margin:0 0 20px;color:#4b5563">Pedido <strong>#${escapeHtml(shortId)}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${input.items
        .map(
          (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(lineName(item))} <span style="color:#6b7280">× ${item.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatClp(item.unitPriceClp * item.quantity)}</td>
      </tr>`
        )
        .join('')}
      <tr><td style="padding:8px 0">Subtotal</td><td style="padding:8px 0;text-align:right">${formatClp(input.subtotalClp)}</td></tr>
      <tr><td style="padding:0 0 8px">Despacho</td><td style="padding:0 0 8px;text-align:right">${formatClp(input.shippingCostClp)}</td></tr>
      <tr><td style="padding:8px 0;border-top:2px solid #14532d;font-weight:700">Total</td><td style="padding:8px 0;border-top:2px solid #14532d;text-align:right;font-weight:700">${formatClp(totalClp)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;color:#4b5563">${escapeHtml(deliveryLine)}</p>
    <p style="margin:16px 0 0;font-size:14px;color:#4b5563">Tu pedido queda como <strong>pendiente de pago</strong>. Te contactamos por email o WhatsApp para coordinar el cobro y la entrega.</p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280"><a href="${SITE_URL}" style="color:#15803d">${SITE_NAME}</a></p>
  </div>
</body></html>`;

  return { subject: `Tu pedido #${shortId} en ${SITE_NAME}`, text, html };
}
