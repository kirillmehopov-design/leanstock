import { Router } from 'express';
import { createWarehouse, listWarehouses, updateWarehouse } from '../controllers/warehouseController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createWarehouseSchema, updateWarehouseSchema } from '../validators/warehouseSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/', listWarehouses);
router.post('/', requireRoles(['OWNER', 'MANAGER']), validate(createWarehouseSchema), createWarehouse);
router.patch('/:id', requireRoles(['OWNER', 'MANAGER']), validate(updateWarehouseSchema), updateWarehouse);

export default router;
