import { Router } from 'express';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { getSale, listSales } from '../controllers/saleController.js';

const router = Router();
router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), listSales);
router.get('/:id', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), getSale);

export default router;
