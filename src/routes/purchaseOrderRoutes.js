import { Router } from 'express';
import { cancelPurchaseOrder, confirmPurchaseOrder, createPurchaseOrder, getPurchaseOrder, listPurchaseOrders } from '../controllers/purchaseOrderController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPurchaseOrderSchema } from '../validators/purchaseOrderSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), listPurchaseOrders);
router.post('/', requireRoles(['OWNER', 'MANAGER']), validate(createPurchaseOrderSchema), createPurchaseOrder);
router.get('/:id', requireRoles(['OWNER', 'MANAGER', 'AUDITOR']), getPurchaseOrder);
router.post('/:id/confirm', requireRoles(['OWNER', 'MANAGER']), confirmPurchaseOrder);
router.post('/:id/cancel', requireRoles(['OWNER', 'MANAGER']), cancelPurchaseOrder);

export default router;
