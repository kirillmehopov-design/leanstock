import { Router } from 'express';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { listTenantAuditLogs } from '../controllers/auditController.js';

const router = Router();
router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), listTenantAuditLogs);

export default router;
