import { z } from 'zod';

const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one digit.');

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: passwordSchema,
    tenantName: z.string().min(2).max(80).optional()
  })
});

export const registerSuperAdminSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: passwordSchema,
    setupKey: z.string().min(10)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32)
  })
});

export const logoutSchema = refreshSchema;

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    newPassword: passwordSchema
  })
});
