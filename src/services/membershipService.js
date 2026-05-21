import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { writeAuditLog } from './auditService.js';

export async function addMembership({ tenantId, actorUserId, email, role }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { memberships: true }
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User with this email was not found.');
  }

  const sameTenantMembership = user.memberships.find((membership) => membership.tenantId === tenantId);
  if (sameTenantMembership) {
    const membership = await prisma.membership.update({
      where: { id: sameTenantMembership.id },
      data: { role },
      include: {
        user: { select: { id: true, email: true, username: true } }
      }
    });

    await writeAuditLog({
      tenantId,
      actorUserId,
      action: 'MEMBERSHIP_ROLE_UPDATED',
      entityType: 'Membership',
      entityId: membership.id,
      metadata: { userId: user.id, previousRole: sameTenantMembership.role, role }
    });

    return membership;
  }

  const otherTenantMembership = user.memberships.find((membership) => membership.tenantId !== tenantId);
  if (otherTenantMembership) {
    throw new AppError(409, 'USER_ALREADY_IN_ANOTHER_TENANT', 'This user already belongs to another tenant. Use an account-only user for role assignment.');
  }

  const membership = await prisma.membership.create({
    data: {
      tenantId,
      userId: user.id,
      role
    },
    include: {
      user: {
        select: { id: true, email: true, username: true }
      }
    }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'MEMBERSHIP_ADDED',
    entityType: 'Membership',
    entityId: membership.id,
    metadata: { userId: user.id, role }
  });

  return membership;
}

export async function listMemberships({ tenantId }) {
  return prisma.membership.findMany({
    where: { tenantId },
    include: {
      user: {
        select: { id: true, email: true, username: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
}


export async function removeMembership({ tenantId, actorUserId, membershipId }) {
  const membership = await prisma.membership.findFirst({
    where: { tenantId, id: membershipId },
    include: { user: { select: { id: true, email: true } } }
  });

  if (!membership) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', 'Membership was not found in this tenant.');
  }

  if (membership.userId === actorUserId && membership.role === 'OWNER') {
    throw new AppError(400, 'OWNER_SELF_REMOVE_BLOCKED', 'OWNER cannot remove their own owner membership.');
  }

  await prisma.membership.delete({ where: { id: membership.id } });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'MEMBERSHIP_REMOVED',
    entityType: 'Membership',
    entityId: membership.id,
    metadata: { userId: membership.userId, email: membership.user.email, role: membership.role }
  });
}

