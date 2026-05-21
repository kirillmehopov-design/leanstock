import { z } from 'zod';

const productBody = z.object({
  sku: z.string().min(2).max(64),
  barcode: z.string().min(2).max(80).optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  basePrice: z.number().positive(),
  minSalePrice: z.number().positive(),
  reorderPoint: z.number().int().min(0).default(0),
  reorderQuantity: z.number().int().min(0).default(0),
  supplierId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional()
});

export const createProductSchema = z.object({ body: productBody });
export const updateProductSchema = z.object({ body: productBody.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required.') });
