import { Router } from 'express';
import { authenticateJWT, requireGlobalRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { forcePasswordReset, listPlatformAuditLogs, listTenants, platformMetrics, reactivateTenant, suspendTenant } from '../controllers/platformController.js';
import { suspendTenantSchema } from '../validators/platformSchemas.js';

const router = Router();
router.use(authenticateJWT, requireGlobalRole(['SUPERADMIN']));
router.get('/tenants', listTenants);
router.get('/metrics', platformMetrics);
router.patch('/tenants/:id/suspend', validate(suspendTenantSchema), suspendTenant);
router.patch('/tenants/:id/reactivate', reactivateTenant);
router.patch('/users/:id/force-password-reset', forcePasswordReset);
router.get('/audit-logs', listPlatformAuditLogs);

export default router;
