import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().min(1, 'Ponle un nombre a esta dirección'),
  region: z.enum(['metropolitana', 'valparaiso', 'biobio', 'araucania', 'los-lagos', 'otra']),
  address: z.string().min(5, 'La dirección es muy corta'),
  isDefault: z.boolean(),
});

export type AddressInput = z.infer<typeof addressSchema>;
