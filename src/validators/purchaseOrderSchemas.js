import { z } from 'zod';

export const createPurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().uuid(),
    expectedAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitCost: z.number().positive()
    })).min(1)
  })
});
