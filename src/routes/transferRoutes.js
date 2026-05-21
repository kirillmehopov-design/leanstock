import { Router } from 'express';
import {
  approveTransfer,
  cancelTransfer,
  createTransfer,
  dispatchTransfer,
  getTransfer,
  listTransfers,
  receiveTransfer
} from '../controllers/transferController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cancelTransferSchema, createTransferSchema, transferIdParamsSchema } from '../validators/transferSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listTransfers);
router.get('/:id', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), validate(transferIdParamsSchema), getTransfer);
router.post('/', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(createTransferSchema), createTransfer);
router.post('/:id/approve', requireRoles(['OWNER', 'MANAGER']), validate(transferIdParamsSchema), approveTransfer);
router.post('/:id/dispatch', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(transferIdParamsSchema), dispatchTransfer);
router.post('/:id/receive', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(transferIdParamsSchema), receiveTransfer);
router.post('/:id/cancel', requireRoles(['OWNER', 'MANAGER']), validate(cancelTransferSchema), cancelTransfer);

export default router;
