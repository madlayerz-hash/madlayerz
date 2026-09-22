import { describe, it, expect } from 'vitest';
import { buildPreferenceBody, decidePayment, preferenceTotal } from './mercadopago';

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const SITE = 'https://madlayerz.cl';

describe('buildPreferenceBody', () => {
  const body = buildPreferenceBody(
    {
      orderId: ORDER_ID,
      shippingCostClp: 3500,
      items: [
        { name: 'Busto Rostro Envuelto', quantity: 1, unitPriceClp: 12900, variantName: 'Verde' },
        { name: 'Llavero Calavera Fosforescente', quantity: 2, unitPriceClp: 3500 },
      ],
    },
    SITE
  );

  it('cobra exactamente productos + despacho', () => {
    expect(preferenceTotal(body)).toBe(12900 + 2 * 3500 + 3500);
  });

  it('nombra el color en la línea', () => {
    expect(body.items[0].title).toBe('Busto Rostro Envuelto (Verde)');
    expect(body.items[1].title).toBe('Llavero Calavera Fosforescente');
  });

  it('usa pesos chilenos en todas las líneas', () => {
    expect(body.items.every((i) => i.currency_id === 'CLP')).toBe(true);
  });

  it('vincula el pago al pedido y apunta el retorno y el aviso al sitio', () => {
    expect(body.external_reference).toBe(ORDER_ID);
    expect(body.back_urls.success).toBe(`${SITE}/checkout/resultado?orderId=${ORDER_ID}`);
    expect(body.notification_url).toBe(`${SITE}/api/payments/mercadopago/webhook`);
  });

  it('no agrega línea de despacho cuando es retiro', () => {
    const pickup = buildPreferenceBody({ orderId: ORDER_ID, shippingCostClp: 0, items: [{ name: 'X', quantity: 1, unitPriceClp: 1000 }] }, SITE);
    expect(pickup.items).toHaveLength(1);
  });
});

describe('decidePayment', () => {
  const order = { id: ORDER_ID, status: 'pendiente_pago', total_clp: 23400 };
  const approved = { id: 99, status: 'approved', external_reference: ORDER_ID, transaction_amount: 23400, currency_id: 'CLP' };

  it('marca pagado un pago aprobado, del pedido correcto y por el monto exacto', () => {
    expect(decidePayment(order, approved).action).toBe('mark_paid');
  });

  it('no marca pagado un pago rechazado o pendiente', () => {
    expect(decidePayment(order, { ...approved, status: 'rejected' }).action).toBe('ignore');
    expect(decidePayment(order, { ...approved, status: 'in_process' }).action).toBe('ignore');
  });

  it('rechaza un pago por un monto distinto', () => {
    expect(decidePayment(order, { ...approved, transaction_amount: 100 }).action).toBe('reject');
  });

  it('rechaza un pago de otro pedido', () => {
    expect(decidePayment(order, { ...approved, external_reference: 'otro' }).action).toBe('reject');
  });

  it('no vuelve a procesar un pedido que ya estaba pagado', () => {
    expect(decidePayment({ ...order, status: 'pagado' }, approved).action).toBe('ignore');
  });
});
