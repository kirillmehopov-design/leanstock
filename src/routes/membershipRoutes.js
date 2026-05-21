import { Router } from 'express';
import { addMembership, listMemberships, removeMembership } from '../controllers/membershipController.js';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addMembershipSchema, membershipIdParamsSchema } from '../validators/membershipSchemas.js';

const router = Router();

router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER']), listMemberships);
router.post('/', requireRoles(['OWNER']), validate(addMembershipSchema), addMembership);
router.delete('/:id', requireRoles(['OWNER']), validate(membershipIdParamsSchema), removeMembership);

export default router;
