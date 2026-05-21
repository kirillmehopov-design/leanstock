import { Queue } from 'bullmq';
import { bullMQConnection } from './connection.js';

export const deadStockQueue = new Queue('dead-stock', {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 }
  }
});

export async function enqueueDeadStockDecay() {
  await deadStockQueue.add('decay', {}, { jobId: 'dead-stock-decay-singleton' });
}
