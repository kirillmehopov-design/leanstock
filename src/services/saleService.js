import { prisma } from '../config/prisma.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';

export async function listSales({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.sale.findMany({
    where: { tenantId },
    include: { items: true },
    ...cursorOptions
  });
  return formatCursorPage(items, limit);
}

export async function getSale({ tenantId, saleId }) {
  return prisma.sale.findFirst({
    where: { id: saleId, tenantId },
    include: { items: true }
  });
}
