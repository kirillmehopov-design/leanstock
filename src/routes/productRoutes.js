import { Router } from 'express';
import { archiveProduct, createProduct, getProduct, listProducts, updateProduct } from '../controllers/productController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/productSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listProducts);
router.post('/', requireRoles(['OWNER', 'MANAGER']), validate(createProductSchema), createProduct);
router.get('/:id', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), getProduct);
router.patch('/:id', requireRoles(['OWNER', 'MANAGER']), validate(updateProductSchema), updateProduct);
router.delete('/:id', requireRoles(['OWNER', 'MANAGER']), archiveProduct);

export default router;
