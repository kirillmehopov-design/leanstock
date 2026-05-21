import { prisma } from '../config/prisma.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';
import { generatePasswordResetForUser } from './authService.js';

export async function listTenants({ query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.tenant.findMany({
    include: { memberships: { select: { id: true }, take: 1 } },
    ...cursorOptions
  });
  return formatCursorPage(items.map((tenant) => ({ ...tenant, memberships: undefined })), limit);
}

export async function platformMetrics() {
  const [tenants, users, products, activeReservations, queues] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.reservation.count({ where: { status: 'ACTIVE' } }),
    prisma.auditLog.count()
  ]);
  return { tenants, users, products, activeReservations, auditEvents: queues };
}

export async function suspendTenant({ tenantId, actorUserId, reason }) {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendedReason: reason ?? 'Administrative suspension' }
  });

  await writeAuditLog({ tenantId, actorUserId, action: 'TENANT_SUSPENDED', entityType: 'Tenant', entityId: tenantId, metadata: { reason } });
  return tenant;
}

export async function reactivateTenant({ tenantId, actorUserId }) {
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { status: 'ACTIVE', suspendedAt: null, suspendedReason: null } });
  await writeAuditLog({ tenantId, actorUserId, action: 'TENANT_REACTIVATED', entityType: 'Tenant', entityId: tenantId, metadata: {} });
  return tenant;
}

export async function listPlatformAuditLogs({ query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.auditLog.findMany({ ...cursorOptions });
  return formatCursorPage(items, limit);
}

export async function forcePasswordReset({ targetUserId, actorUserId, reason }) {
  const result = await generatePasswordResetForUser({ userId: targetUserId });
  await writeAuditLog({
    tenantId: null,
    actorUserId,
    action: 'PLATFORM_FORCE_PASSWORD_RESET',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { reason }
  });
  return result;
}
