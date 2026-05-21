import { z } from 'zod';

export const suspendTenantSchema = z.object({
  body: z.object({
    reason: z.string().min(2).max(200).optional()
  })
});
