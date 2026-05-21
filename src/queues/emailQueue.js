import { Queue } from 'bullmq';
import { bullMQConnection } from './connection.js';

export const emailQueue = new Queue('email', {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 }
  }
});

/**
 * Enqueue an email job (non-blocking — API returns immediately).
 * jobName examples: 'verify-email', 'password-reset', 'low-stock-alert', 'transfer-approved'
 */
export async function enqueueEmail(jobName, payload) {
  return emailQueue.add(jobName, payload);
}
