import crypto from 'crypto';
import { redis } from '../config/redis.js';
import { AppError } from '../errors/AppError.js';

export async function withRedisLock(key, ttlMs, callback) {
  const value = crypto.randomUUID();
  const acquired = await redis.set(key, value, { NX: true, PX: ttlMs });

  if (acquired !== 'OK') {
    throw new AppError(409, 'RESOURCE_LOCKED', 'Inventory is locked by another operation. Try again.');
  }

  try {
    return await callback();
  } finally {
    const currentValue = await redis.get(key);

    if (currentValue === value) {
      await redis.del(key);
    }
  }
}
