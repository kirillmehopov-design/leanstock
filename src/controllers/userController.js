import { prisma } from '../config/prisma.js';

export async function me(req, res, next) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: { tenant: true }
    });

    res.json({
      user: req.user,
      memberships: memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant.name,
        role: membership.role
      }))
    });
  } catch (error) {
    next(error);
  }
}
