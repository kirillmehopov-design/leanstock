import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken, createRefreshTokenValue, hashToken, refreshTokenExpiresAt } from '../utils/token.js';
import { slugify } from '../utils/slug.js';
import { env } from '../config/env.js';
import { enqueueEmail } from '../queues/emailQueue.js';

function authPayload(user, refreshToken, tenantId = undefined) {
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified
    },
    ...(tenantId ? { tenantId } : {}),
    accessToken: signAccessToken(user),
    refreshToken
  };
}

function generateVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenExpiresAt(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function apiUrl(path, token) {
  const base = env.APP_BASE_URL.replace(/\/$/, '');
  return `${base}/api/v1/${path}?token=${encodeURIComponent(token)}`;
}

function frontendResetUrl(token) {
  const base = env.FRONTEND_BASE_URL.replace(/\/$/, '');
  return `${base}/#/password-reset?token=${encodeURIComponent(token)}`;
}

export async function register({ email, username, password, tenantName }) {
  const normalizedEmail = email.toLowerCase();

  // Local demo safety: make Register idempotent in mock email mode.
  // This prevents Postman demos from breaking when the same email was registered earlier.
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { memberships: { take: 1, select: { tenantId: true } } }
  });

  if (existingUser) {
    if (env.EMAIL_PROVIDER !== 'mock') {
      throw new AppError(409, 'CONFLICT', 'User with this email already exists.');
    }

    // In mock/local mode, re-running Register should always prepare a clean demo flow:
    // Register -> Verify email -> Login. This avoids manual database cleanup during defense practice.
    const verificationToken = generateVerifyToken();
    const demoPasswordHash = await hashPassword(password);
    const userForPayload = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username,
        passwordHash: demoPasswordHash,
        emailVerified: false,
        emailVerifyToken: verificationToken,
        emailVerifyExpiresAt: tokenExpiresAt(env.EMAIL_VERIFICATION_TOKEN_MINUTES),
        passwordResetToken: null,
        passwordResetExpiresAt: null
      },
      include: { memberships: { take: 1, select: { tenantId: true } } }
    });

    const refreshToken = createRefreshTokenValue();
    await prisma.refreshToken.create({
      data: {
        userId: existingUser.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt()
      }
    });

    const tenantId = userForPayload.memberships[0]?.tenantId;
    const verifyUrl = apiUrl('auth/verify-email', verificationToken);
    await enqueueEmail('verify-email', {
      to: userForPayload.email,
      username: userForPayload.username,
      token: verificationToken,
      verifyUrl
    });

    return {
      ...authPayload(userForPayload, refreshToken, tenantId),
      message: 'Existing demo user was reset for a clean mock verification flow. Use this verificationToken in Verify email.',
      verificationToken
    };
  }

  const passwordHash = await hashPassword(password);
  const refreshToken = createRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshToken);
  const verifyToken = generateVerifyToken();
  const verifyExpiresAt = tokenExpiresAt(env.EMAIL_VERIFICATION_TOKEN_MINUTES);

  // OWNER onboarding creates a tenant. Regular MANAGER/STAFF/AUDITOR users register as accounts only
  // and receive a tenant role later when the OWNER adds them through /memberships.
  if (!tenantName) {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash,
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpiresAt: verifyExpiresAt
      }
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt()
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'AUTH_REGISTER_ACCOUNT_ONLY',
        entityType: 'User',
        entityId: user.id
      }
    });

    const verifyUrl = apiUrl('auth/verify-email', verifyToken);
    await enqueueEmail('verify-email', {
      to: user.email,
      username: user.username,
      token: verifyToken,
      verifyUrl
    });

    return {
      ...authPayload(user, refreshToken),
      message: 'User account registered. Verify email, then ask OWNER to assign this user to a tenant role.',
      ...(env.EMAIL_PROVIDER === 'mock' ? { verificationToken: verifyToken } : {})
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash,
        emailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpiresAt: verifyExpiresAt
      }
    });

    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug: slugify(tenantName)
      }
    });

    await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER'
      }
    });

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExpiresAt()
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: 'AUTH_REGISTER',
        entityType: 'User',
        entityId: user.id,
        metadata: { tenantName }
      }
    });

    return { user, tenant };
  });

  // Enqueue verification email asynchronously (non-blocking)
  const verifyUrl = apiUrl('auth/verify-email', verifyToken);
  await enqueueEmail('verify-email', {
    to: result.user.email,
    username: result.user.username,
    token: verifyToken,
    verifyUrl
  });

  return {
    ...authPayload(result.user, refreshToken, result.tenant.id),
    ...(env.EMAIL_PROVIDER === 'mock' ? { verificationToken: verifyToken } : {})
  };
}


export async function registerSuperAdmin({ email, username, password, setupKey }) {
  if (setupKey !== env.SUPERADMIN_SETUP_KEY) {
    throw new AppError(403, 'FORBIDDEN', 'Invalid super admin setup key.');
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const verificationToken = generateVerifyToken();
  const passwordHash = await hashPassword(password);
  const refreshToken = createRefreshTokenValue();

  const user = existingUser
    ? await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username,
        passwordHash,
        globalRole: 'SUPERADMIN',
        emailVerified: false,
        emailVerifyToken: verificationToken,
        emailVerifyExpiresAt: tokenExpiresAt(env.EMAIL_VERIFICATION_TOKEN_MINUTES),
        passwordResetToken: null,
        passwordResetExpiresAt: null
      }
    })
    : await prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash,
        globalRole: 'SUPERADMIN',
        emailVerified: false,
        emailVerifyToken: verificationToken,
        emailVerifyExpiresAt: tokenExpiresAt(env.EMAIL_VERIFICATION_TOKEN_MINUTES)
      }
    });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt()
    }
  });

  const verifyUrl = apiUrl('auth/verify-email', verificationToken);
  await enqueueEmail('verify-email', { to: user.email, username: user.username, verifyUrl, token: verificationToken });

  return {
    ...authPayload(user, refreshToken),
    message: 'Platform Super Admin created. Verify email before login.',
    ...(env.EMAIL_PROVIDER === 'mock' ? { verificationToken } : {})
  };
}

export async function verifyEmail(token) {
  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token }
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Email verification token is invalid.');
  }

  if (user.emailVerified) {
    return { message: 'Email is already verified.' };
  }

  if (user.emailVerifyExpiresAt < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', 'Email verification token has expired. Please register again.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'AUTH_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: user.id
    }
  });

  return { message: 'Email verified successfully. You can now log in.' };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (!user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before logging in.',
      env.EMAIL_PROVIDER === 'mock' && user.emailVerifyToken ? { verificationToken: user.emailVerifyToken } : undefined);
  }

  const refreshToken = createRefreshTokenValue();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt()
    }
  });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { tenantId: true, role: true }
  });

  return {
    ...authPayload(user, refreshToken),
    memberships
  };
}

export async function refresh(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  return {
    accessToken: signAccessToken(storedToken.user)
  };
}

export async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });

  return { message: 'Logged out.' };
}

export async function requestPasswordReset({ email }) {
  // Always return success to prevent user enumeration
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  let mockResetToken;

  if (user) {
    const resetToken = generateVerifyToken();
    mockResetToken = resetToken;
    const resetExpiresAt = tokenExpiresAt(env.PASSWORD_RESET_TOKEN_MINUTES);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiresAt
      }
    });

    const resetUrl = frontendResetUrl(resetToken);
    await enqueueEmail('password-reset', {
      to: user.email,
      username: user.username,
      token: resetToken,
      resetUrl
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUESTED',
        entityType: 'User',
        entityId: user.id
      }
    });
  }

  return {
    message: 'If an account with that email exists, a password reset link has been sent.',
    ...(env.EMAIL_PROVIDER === 'mock' && mockResetToken ? { resetToken: mockResetToken } : {})
  };
}

export async function resetPassword({ token, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token }
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid.');
  }

  if (user.passwordResetExpiresAt < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', 'Password reset token has expired. Please request a new one.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      tokenVersion: { increment: 1 } // Invalidate all existing access tokens
    }
  });

  // Revoke all refresh tokens for security
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id
    }
  });

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
}

export async function generatePasswordResetForUser({ userId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User was not found.');
  }

  const resetToken = generateVerifyToken();
  const resetExpiresAt = tokenExpiresAt(env.PASSWORD_RESET_TOKEN_MINUTES);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: resetExpiresAt,
      tokenVersion: { increment: 1 }
    }
  });

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });

  const resetUrl = frontendResetUrl(resetToken);
  await enqueueEmail('password-reset', { to: user.email, username: user.username, resetUrl, token: resetToken });

  return {
    message: 'Password reset was forced and reset email was enqueued.',
    ...(env.EMAIL_PROVIDER === 'mock' ? { resetToken } : {})
  };
}
