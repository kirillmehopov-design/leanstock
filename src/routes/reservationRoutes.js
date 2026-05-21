import { Router } from 'express';
import { authenticateJWT, resolveTenant, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cancelReservation, confirmReservation, createReservation, listReservations } from '../controllers/reservationController.js';
import { createReservationSchema } from '../validators/reservationSchemas.js';

const router = Router();
router.use(authenticateJWT, resolveTenant);
router.get('/', requireRoles(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']), listReservations);
router.post('/', requireRoles(['OWNER', 'MANAGER', 'STAFF']), validate(createReservationSchema), createReservation);
router.post('/:id/confirm', requireRoles(['OWNER', 'MANAGER', 'STAFF']), confirmReservation);
router.post('/:id/cancel', requireRoles(['OWNER', 'MANAGER', 'STAFF']), cancelReservation);

export default router;
