import { z } from 'zod';

export const createTransferSchema = z.object({
  body: z.object({
    fromWarehouseId: z.string().uuid(),
    toWarehouseId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    })).min(1)
  })
});

export const transferIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const cancelTransferSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().max(300).optional()
  }).optional()
});
