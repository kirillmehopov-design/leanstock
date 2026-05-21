import { z } from 'zod';

export const addMembershipSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    role: z.enum(['MANAGER', 'STAFF', 'AUDITOR'])
  })
});

export const membershipIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});
