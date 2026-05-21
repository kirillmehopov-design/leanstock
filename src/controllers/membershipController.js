import * as membershipService from '../services/membershipService.js';

export async function addMembership(req, res, next) {
  try {
    const membership = await membershipService.addMembership({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      email: req.body.email,
      role: req.body.role
    });

    res.status(201).json(membership);
  } catch (error) {
    next(error);
  }
}

export async function removeMembership(req, res, next) {
  try {
    await membershipService.removeMembership({
      tenantId: req.tenant.id,
      actorUserId: req.user.id,
      membershipId: req.params.id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listMemberships(req, res, next) {
  try {
    const memberships = await membershipService.listMemberships({ tenantId: req.tenant.id });
    res.json({ data: memberships });
  } catch (error) {
    next(error);
  }
}
