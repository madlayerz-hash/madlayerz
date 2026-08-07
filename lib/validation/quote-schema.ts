import { z } from 'zod';

export const quoteRequestSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(8, 'Teléfono inválido'),
  description: z.string().min(10, 'Cuéntanos un poco más sobre tu proyecto'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  budgetClp: z.number().int().nonnegative().optional(),
  referenceImageUrl: z.string().url().optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
