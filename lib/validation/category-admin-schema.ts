import { z } from 'zod';

export const categoryAdminSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'El slug solo puede tener minúsculas, números y guiones'),
  name: z.string().min(2, 'El nombre es muy corto'),
});

export type CategoryAdminInput = z.infer<typeof categoryAdminSchema>;
