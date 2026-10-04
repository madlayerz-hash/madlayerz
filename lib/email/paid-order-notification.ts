import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOrderConfirmationEmail, type OrderEmailItem } from './order-confirmation';
import { NOTIFICATION_EMAIL, RESEND_FROM, sendEmailSafely } from './resend-client';

interface PaidOrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_method: 'domicilio' | 'retiro';
  region: string | null;
  address: string | null;
  subtotal_clp: number;
  shipping_cost_clp: number;
}

interface PaidOrderLine {
  quantity: number;
  unit_price_clp: number;
  variant_name: string | null;
  products: { name: string } | null;
}

/**
 * Avisos de «pago recibido»: uno al cliente y otro a MadLayerz.
 *
 * Se llama una sola vez por pedido, desde la confirmación del pago, y sólo
 * cuando la actualización a `pagado` fue efectiva. Antes el correo salía al
 * crear el pedido, así que quien abandonaba el checkout igual recibía una
 * «confirmación» de algo que nunca pagó.
 *
 * Nunca lanza: un problema de correo no puede deshacer un pago ya cobrado ni
 * hacer que Mercado Pago reintente la notificación.
 */
export async function sendPaidOrderEmails(admin: SupabaseClient, orderId: string): Promise<void> {
  try {
    const { data: order, error } = await admin
      .from('orders')
      .select(
        'id, customer_name, customer_email, customer_phone, delivery_method, region, address, subtotal_clp, shipping_cost_clp'
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      console.error(`[email] el pedido ${orderId} se pagó pero no se pudo leer para avisar.`);
      return;
    }

    const row = order as unknown as PaidOrderRow;

    const { data: lines, error: linesError } = await admin
      .from('order_items')
      .select('quantity, unit_price_clp, variant_name, products ( name )')
      .eq('order_id', orderId);

    if (linesError) throw linesError;

    const items: OrderEmailItem[] = ((lines ?? []) as unknown as PaidOrderLine[]).map((line) => ({
      name: line.products?.name ?? 'Producto MadLayerz',
      quantity: line.quantity,
      unitPriceClp: line.unit_price_clp,
      variantName: line.variant_name ?? undefined,
    }));

    const email = buildOrderConfirmationEmail({
      orderId: row.id,
      customerName: row.customer_name,
      items,
      subtotalClp: row.subtotal_clp,
      shippingCostClp: row.shipping_cost_clp,
      deliveryMethod: row.delivery_method,
      region: row.region,
      address: row.address,
      paid: true,
    });

    await sendEmailSafely('pago confirmado', (resend) =>
      resend.emails.send({
        from: RESEND_FROM,
        to: row.customer_email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      })
    );

    // Y el aviso para quien tiene que imprimir la pieza.
    const notifyTo = NOTIFICATION_EMAIL;
    if (notifyTo) {
      const phone = row.customer_phone ? `, ${row.customer_phone}` : '';
      await sendEmailSafely('aviso interno de pago', (resend) =>
        resend.emails.send({
          from: RESEND_FROM,
          to: notifyTo,
          replyTo: row.customer_email,
          subject: `Pago recibido · pedido #${row.id.slice(0, 8).toUpperCase()} — ${row.customer_name}`,
          text: `${row.customer_name} (${row.customer_email}${phone})\n\n${email.text}`,
        })
      );
    }
  } catch (mailError) {
    console.error(`[email] fallo al avisar del pago del pedido ${orderId}`, mailError);
  }
}
