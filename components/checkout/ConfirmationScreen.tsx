import Link from 'next/link';
import { formatClp } from '@/lib/site';

export function ConfirmationScreen({ orderId, totalClp }: { orderId: string; totalClp?: number }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
      <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
        ¡Pedido recibido!
      </h2>
      <p>
        Tu número de pedido es <strong>#{orderId.slice(0, 8).toUpperCase()}</strong>.
      </p>
      {totalClp !== undefined && <p className="text-lg font-bold">{formatClp(totalClp)}</p>}
      <p className="max-w-md text-sm opacity-80">
        Te enviamos un correo con el detalle. Te contactaremos por email o WhatsApp para coordinar el
        pago y la entrega.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/catalogo" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
          Seguir comprando
        </Link>
        <Link href="/cuenta" className="rounded-full border border-current px-6 py-3 font-semibold">
          Ver mis pedidos
        </Link>
      </div>
    </div>
  );
}
