import { redis } from '../config/redis.js';
import { AppError } from '../errors/AppError.js';

export function tokenBucketRateLimit({ keyPrefix, maxAttempts, windowSeconds }) {
  return async (req, _res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate:${keyPrefix}:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > maxAttempts) {
      return next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.'));
    }

    next();
  };
}
