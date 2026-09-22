import Link from 'next/link';
import type { Metadata } from 'next';
import { createAdminSupabaseClient } from '@/lib/supabase/admin-client';
import { confirmMercadoPagoPayment } from '@/lib/payments/mercadopago-server';
import { formatClp } from '@/lib/site';
import { ClearCartOnPaid } from './ClearCartOnPaid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resultado del pago',
  robots: { index: false, follow: false },
};

type OrderSummary = { id: string; status: string; total_clp: number };

type SearchParams = {
  orderId?: string;
  payment_id?: string;
  collection_status?: string;
  status?: string;
};

export default async function ResultadoPage({ searchParams }: { searchParams?: SearchParams }) {
  const orderId = searchParams?.orderId ?? '';
  const paymentId = searchParams?.payment_id;
  const mpStatus = searchParams?.collection_status ?? searchParams?.status ?? '';

  // Al volver de Mercado Pago se confirma el pago en el momento, sin esperar la
  // notificación. Es seguro: el estado real se consulta a Mercado Pago.
  if (paymentId && paymentId !== 'null') {
    try {
      await confirmMercadoPagoPayment(paymentId);
    } catch (error) {
      console.error('[mercadopago] no se pudo confirmar al volver del checkout', error);
    }
  }

  let order: OrderSummary | null = null;
  if (orderId) {
    try {
      const { data } = await createAdminSupabaseClient()
        .from('orders')
        .select('id, status, total_clp')
        .eq('id', orderId)
        .maybeSingle();
      order = (data as OrderSummary | null) ?? null;
    } catch {
      order = null;
    }
  }

  const shortId = order ? order.id.slice(0, 8).toUpperCase() : '';
  const isPaid = order?.status === 'pagado';
  const isPending = !isPaid && (mpStatus === 'pending' || mpStatus === 'in_process');

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
        {isPaid ? (
          <>
            <ClearCartOnPaid />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
              ¡Pago recibido!
            </h1>
            <p>
              Tu pedido <strong>#{shortId}</strong> está pagado
              {order ? <> por <strong>{formatClp(order.total_clp)}</strong></> : null}.
            </p>
            <p className="max-w-md text-sm opacity-80">
              Ya empezamos a prepararlo. Te escribiremos por email o WhatsApp cuando esté listo para
              despacho o retiro.
            </p>
          </>
        ) : isPending ? (
          <>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
              Tu pago está en proceso
            </h1>
            <p className="max-w-md text-sm opacity-80">
              Mercado Pago todavía está confirmando el pago{shortId ? <> del pedido <strong>#{shortId}</strong></> : null}.
              Apenas se apruebe, el pedido quedará pagado automáticamente — no tienes que hacer nada más.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
              El pago no se completó
            </h1>
            <p className="max-w-md text-sm opacity-80">
              No se hizo ningún cobro. Tu carrito sigue guardado: puedes intentarlo de nuevo con otra
              tarjeta u otro medio de pago.
            </p>
          </>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {isPaid ? (
            <>
              <Link href="/catalogo" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
                Seguir comprando
              </Link>
              <Link href="/cuenta" className="rounded-full border border-current px-6 py-3 font-semibold">
                Ver mis pedidos
              </Link>
            </>
          ) : (
            <Link href="/checkout" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
              Volver al checkout
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
