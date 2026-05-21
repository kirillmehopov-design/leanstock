import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/token.js';

export async function authenticateJWT(req, _res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer token.');
    }

    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.');
    }

    if (!user.emailVerified) {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before accessing protected routes.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      tokenVersion: user.tokenVersion,
      globalRole: user.globalRole
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
}

export async function resolveTenant(req, _res, next) {
  try {
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { tenant: true }
    });

    if (!membership) {
      return next(new AppError(400, 'TENANT_REQUIRED', 'User does not have a tenant membership.'));
    }

    if (!membership.tenant) {
      return next(new AppError(404, 'TENANT_NOT_FOUND', 'Tenant was not found.'));
    }

    if (membership.tenant.status === 'SUSPENDED') {
      return next(new AppError(403, 'TENANT_SUSPENDED', 'This tenant is suspended.'));
    }

    req.tenant = { id: membership.tenantId };
    req.membership = membership;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(allowedRoles) {
  return (req, _res, next) => {
    if (!req.membership || !allowedRoles.includes(req.membership.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'This role is not allowed to perform this action.'));
    }

    next();
  };
}

export function requireGlobalRole(allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.globalRole)) {
      return next(new AppError(403, 'FORBIDDEN', 'This global role is not allowed to perform this action.'));
    }

    next();
  };
}
