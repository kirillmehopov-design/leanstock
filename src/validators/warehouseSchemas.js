import { z } from 'zod';

export const createWarehouseSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    address: z.string().max(200).optional()
  })
});

export const updateWarehouseSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    address: z.string().max(200).optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.'
  })
});
