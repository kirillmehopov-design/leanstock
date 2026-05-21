import { Router } from 'express';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCategory, createSupplier, listCategories, listSuppliers } from '../controllers/catalogController.js';
import { createCategorySchema, createSupplierSchema } from '../validators/catalogSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/suppliers', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listSuppliers);
router.post('/suppliers', requireRoles(['OWNER', 'MANAGER']), validate(createSupplierSchema), createSupplier);
router.get('/categories', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listCategories);
router.post('/categories', requireRoles(['OWNER', 'MANAGER']), validate(createCategorySchema), createCategory);

export default router;
