import { z } from 'zod';

export const shippingInfoSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
});

export type ShippingInfoInput = z.infer<typeof shippingInfoSchema>;

export const deliverySchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('retiro') }),
  z.object({
    method: z.literal('domicilio'),
    region: z.enum(['metropolitana', 'valparaiso', 'biobio', 'araucania', 'los-lagos', 'otra']),
    address: z.string().min(5, 'La dirección es muy corta'),
  }),
]);

export type DeliveryInput = z.infer<typeof deliverySchema>;

export const paymentMethodSchema = z.enum(['flow', 'mercadopago']);
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
