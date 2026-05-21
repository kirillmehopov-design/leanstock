import { prisma } from '../config/prisma.js';

export async function writeAuditLog({ tenantId, actorUserId, action, entityType, entityId, metadata }, client = prisma) {
  return client.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}
