import { z } from 'zod';
import { paymentMethodSchema } from './checkout-schema';

export const REGIONS = ['metropolitana', 'valparaiso', 'biobio', 'araucania', 'los-lagos', 'otra'] as const;

/**
 * What the browser is allowed to send when placing an order.
 *
 * Prices are deliberately NOT part of it: the server looks every product up in
 * the database and recomputes the totals. The previous version forwarded the
 * client's `unitPriceClp` / `subtotalClp` straight into the database, so a
 * crafted request could buy anything for $1 — which becomes a real charge the
 * moment Flow is wired up.
 */
export const orderRequestSchema = z
  .object({
    customerName: z.string().min(2, 'El nombre es muy corto'),
    customerEmail: z.string().email('Email inválido'),
    customerPhone: z.string().min(8, 'Teléfono inválido'),
    deliveryMethod: z.enum(['domicilio', 'retiro']),
    region: z.enum(REGIONS).optional(),
    address: z.string().min(5, 'La dirección es muy corta').optional(),
    paymentMethod: paymentMethodSchema,
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Producto inválido'),
          quantity: z.number().int().positive().max(99, 'Cantidad máxima: 99'),
          // El nombre del color se valida contra la base de datos en priceOrder.
          variantName: z.string().min(1).max(60).optional(),
        })
      )
      .min(1, 'El carrito está vacío'),
  })
  .refine((data) => data.deliveryMethod !== 'domicilio' || (data.region && data.address), {
    message: 'Falta la región o la dirección de envío',
    path: ['address'],
  });

export type OrderRequestInput = z.infer<typeof orderRequestSchema>;
