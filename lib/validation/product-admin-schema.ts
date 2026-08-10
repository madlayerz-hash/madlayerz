import { z } from 'zod';

export const productAdminSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  description: z.string().min(10, 'Cuéntanos más sobre el producto'),
  priceClp: z.number().int().positive('El precio debe ser mayor a 0'),
  categoryId: z.string().min(1, 'Elige una categoría'),
  featured: z.boolean(),
});

export type ProductAdminInput = z.infer<typeof productAdminSchema>;
