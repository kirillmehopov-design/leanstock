import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { bullMQConnection } from '../queues/connection.js';
import { deadStockQueue } from '../queues/deadStockQueue.js';
import { runDeadStockDecay } from '../services/decayService.js';

let deadStockWorkerInstance;
let cronIntervalId;

export function startDeadStockWorker() {
  if (!env.ENABLE_WORKER) {
    return;
  }

  // BullMQ worker processes decay jobs from the queue
  deadStockWorkerInstance = new Worker(
    'dead-stock',
    async () => {
      const result = await runDeadStockDecay();
      console.log(`[DeadStockWorker] Decay run complete — updated ${result.updatedCount} batches.`);
      return result;
    },
    {
      connection: bullMQConnection,
      concurrency: 1
    }
  );

  deadStockWorkerInstance.on('failed', (job, err) => {
    console.error(`[DeadStockWorker] Job ${job?.id} failed:`, err.message);
  });

  // Cron: enqueue a decay job on a fixed schedule
  const intervalMs = env.DEAD_STOCK_CRON_MINUTES * 60 * 1000;
  cronIntervalId = setInterval(async () => {
    try {
      await deadStockQueue.add('decay', {}, { jobId: `decay-${Date.now()}` });
      console.log('[DeadStockWorker] Decay job enqueued by cron.');
    } catch (err) {
      console.error('[DeadStockWorker] Failed to enqueue cron job:', err.message);
    }
  }, intervalMs);

  console.log(`[DeadStockWorker] Started — cron every ${env.DEAD_STOCK_CRON_MINUTES} min.`);
}

export function stopDeadStockWorker() {
  if (cronIntervalId) clearInterval(cronIntervalId);
  return deadStockWorkerInstance?.close();
}
