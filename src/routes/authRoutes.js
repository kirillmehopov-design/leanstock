import { Router } from 'express';
import {
  register, registerSuperAdmin, verifyEmail, login, refresh, logout,
  requestPasswordReset, resetPassword
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { tokenBucketRateLimit } from '../middleware/rateLimit.js';
import {
  registerSchema, registerSuperAdminSchema, loginSchema, refreshSchema, logoutSchema,
  requestPasswordResetSchema, resetPasswordSchema
} from '../validators/authSchemas.js';

const router = Router();

router.post(
  '/register',
  tokenBucketRateLimit({ keyPrefix: 'register', maxAttempts: 5, windowSeconds: 60 }),
  validate(registerSchema),
  register
);


router.post(
  '/register-super-admin',
  tokenBucketRateLimit({ keyPrefix: 'register-super-admin', maxAttempts: 3, windowSeconds: 300 }),
  validate(registerSuperAdminSchema),
  registerSuperAdmin
);

// GET — user clicks link in email
router.get('/verify-email', verifyEmail);

router.post(
  '/login',
  tokenBucketRateLimit({ keyPrefix: 'login', maxAttempts: 5, windowSeconds: 60 }),
  validate(loginSchema),
  login
);

router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', validate(logoutSchema), logout);

router.post(
  '/request-password-reset',
  tokenBucketRateLimit({ keyPrefix: 'pwd-reset', maxAttempts: 3, windowSeconds: 300 }),
  validate(requestPasswordResetSchema),
  requestPasswordReset
);

router.post(
  '/reset-password',
  tokenBucketRateLimit({ keyPrefix: 'pwd-reset-confirm', maxAttempts: 5, windowSeconds: 300 }),
  validate(resetPasswordSchema),
  resetPassword
);

export default router;
