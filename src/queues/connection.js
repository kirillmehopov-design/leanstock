import { env } from '../config/env.js';

// BullMQ requires an ioredis-compatible connection config
export const bullMQConnection = {
  url: env.REDIS_URL
};
