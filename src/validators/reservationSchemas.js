import { z } from 'zod';

export const createReservationSchema = z.object({
  body: z.object({
    warehouseId: z.string().uuid(),
    customerName: z.string().min(2).max(120).optional(),
    customerEmail: z.string().email().optional(),
    expiresAt: z.string().datetime().optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    })).min(1)
  })
});
