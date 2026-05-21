import { Router } from 'express';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { triggerDeadStockDecay, getQueueStatus } from '../controllers/jobController.js';

const router = Router();

// All job endpoints require authentication
router.use(authenticateJWT, resolveTenant);

// POST /api/v1/jobs/dead-stock/trigger — manually trigger decay (useful for demo / Postman)
router.post('/dead-stock/trigger', requireRoles(['OWNER', 'MANAGER']), triggerDeadStockDecay);

// GET /api/v1/jobs/status — observe queue counts
router.get('/status', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), getQueueStatus);

export default router;
