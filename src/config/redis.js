import { createClient } from 'redis';
import { env } from './env.js';

export const redis = createClient({
  url: env.REDIS_URL
});

redis.on('error', (error) => {
  console.error('Redis error:', error.message);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis() {
  if (redis.isOpen) {
    await redis.quit();
  }
}
