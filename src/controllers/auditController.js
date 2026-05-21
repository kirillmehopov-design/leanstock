import { prisma } from '../config/prisma.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';

export async function listTenantAuditLogs(req, res, next) {
  try {
    const { limit, ...cursorOptions } = buildCursorOptions(req.query);
    const items = await prisma.auditLog.findMany({ where: { tenantId: req.tenant.id }, ...cursorOptions });
    res.json(formatCursorPage(items, limit));
  } catch (error) {
    next(error);
  }
}
