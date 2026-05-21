import { Router } from 'express';
import {
  deadStockReport,
  forecastReorderSuggestions,
  getDeadStockPolicy,
  inventorySnapshot,
  lowStockReport,
  runDeadStockDecayNow,
  updateDeadStockPolicy
} from '../controllers/inventoryController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deadStockPolicySchema } from '../validators/inventorySchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/low-stock', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), lowStockReport);
router.get('/dead-stock', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), deadStockReport);
router.get('/dead-stock-policy', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), getDeadStockPolicy);
router.patch('/dead-stock-policy', requireRoles(['OWNER', 'MANAGER']), validate(deadStockPolicySchema), updateDeadStockPolicy);
router.get('/inventory-snapshot', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), inventorySnapshot);
router.get('/forecast/reorder-suggestions', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), forecastReorderSuggestions);
router.post('/dead-stock-decay/run', requireRoles(['OWNER', 'MANAGER']), runDeadStockDecayNow);

export default router;
