export function ConfirmationScreen({ orderId }: { orderId: string }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 p-8 text-center">
      <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
        ¡Pedido recibido!
      </h2>
      <p>Tu número de pedido es <strong>{orderId}</strong>.</p>
      <p className="max-w-md text-sm opacity-80">
        Te contactaremos por email o WhatsApp para coordinar el pago y la entrega.
      </p>
    </div>
  );
}
