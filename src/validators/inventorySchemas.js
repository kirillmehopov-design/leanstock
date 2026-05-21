import { z } from 'zod';

export const receiveBatchSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    quantityOnHand: z.number().int().positive(),
    unitCost: z.number().positive(),
    salePrice: z.number().positive(),
    minSalePrice: z.number().positive(),
    receivedAt: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional()
  })
});

export const adjustInventorySchema = z.object({
  body: z.object({
    batchId: z.string().uuid(),
    newQuantityOnHand: z.number().int().min(0),
    reason: z.enum(['SHRINKAGE', 'DAMAGE', 'RECOUNT', 'MANUAL_CORRECTION']),
    note: z.string().max(300).optional()
  })
});

export const createIssueReportSchema = z.object({
  body: z.object({
    batchId: z.string().uuid(),
    proposedQuantity: z.number().int().min(0),
    reason: z.enum(['SHRINKAGE', 'DAMAGE', 'RECOUNT', 'MANUAL_CORRECTION']),
    note: z.string().max(300).optional()
  })
});

export const issueReportIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const resolveIssueReportSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    resolutionNote: z.string().max(300).optional()
  }).optional()
});

export const deadStockPolicySchema = z.object({
  body: z.object({
    ageDays: z.number().int().min(1).max(365).optional(),
    discountPercent: z.number().int().min(1).max(90).optional(),
    cooldownHours: z.number().int().min(1).max(24 * 30).optional()
  }).refine((body) => Object.keys(body).length > 0, 'At least one policy field is required')
});
