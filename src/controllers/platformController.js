import * as platformService from '../services/platformService.js';

export async function listTenants(req, res, next) {
  try { res.json(await platformService.listTenants({ query: req.query })); }
  catch (error) { next(error); }
}

export async function platformMetrics(req, res, next) {
  try { res.json(await platformService.platformMetrics()); }
  catch (error) { next(error); }
}

export async function suspendTenant(req, res, next) {
  try { res.json(await platformService.suspendTenant({ tenantId: req.params.id, actorUserId: req.user.id, reason: req.body.reason })); }
  catch (error) { next(error); }
}

export async function reactivateTenant(req, res, next) {
  try { res.json(await platformService.reactivateTenant({ tenantId: req.params.id, actorUserId: req.user.id })); }
  catch (error) { next(error); }
}

export async function forcePasswordReset(req, res, next) {
  try { res.json(await platformService.forcePasswordReset({ targetUserId: req.params.id, actorUserId: req.user.id, reason: req.body.reason })); }
  catch (error) { next(error); }
}

export async function listPlatformAuditLogs(req, res, next) {
  try { res.json(await platformService.listPlatformAuditLogs({ query: req.query })); }
  catch (error) { next(error); }
}
