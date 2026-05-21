import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().min(3).max(40).optional(),
    email: z.string().email().optional()
  })
});

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80)
  })
});
