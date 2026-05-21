import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';

export async function createWarehouse({ tenantId, actorUserId, name, address }) {
  const warehouse = await prisma.warehouse.create({
    data: { tenantId, name, address }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'WAREHOUSE_CREATED',
    entityType: 'Warehouse',
    entityId: warehouse.id,
    metadata: { name }
  });

  return warehouse;
}

export async function listWarehouses({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.warehouse.findMany({
    where: { tenantId },
    ...cursorOptions
  });

  return formatCursorPage(items, limit);
}

export async function updateWarehouse({ tenantId, actorUserId, warehouseId, data }) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId, isActive: true } });
  if (!warehouse) {
    throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse was not found.');
  }

  const updated = await prisma.warehouse.update({
    where: { id: warehouse.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.address !== undefined ? { address: data.address } : {})
    }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'WAREHOUSE_UPDATED',
    entityType: 'Warehouse',
    entityId: updated.id,
    metadata: { name: updated.name, address: updated.address }
  });

  return updated;
}
