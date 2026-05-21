import { deadStockQueue } from '../queues/deadStockQueue.js';
import { emailQueue } from '../queues/emailQueue.js';

export async function triggerDeadStockDecay(req, res, next) {
  try {
    const job = await deadStockQueue.add('decay', { triggeredBy: req.user.id });
    const counts = await deadStockQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
    res.status(202).json({
      message: 'Dead-stock decay job enqueued.',
      jobId: job.id,
      queueCounts: counts
    });
  } catch (error) {
    next(error);
  }
}

export async function getQueueStatus(_req, res, next) {
  try {
    const [emailCounts, decayCounts] = await Promise.all([
      emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      deadStockQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
    ]);

    res.status(200).json({
      queues: {
        email: emailCounts,
        deadStock: decayCounts
      },
      workers: {
        reservationExpiry: { status: 'running', intervalSeconds: 60 },
        deadStock: { status: 'running' },
        email: { status: 'running', concurrency: 5 }
      }
    });
  } catch (error) {
    next(error);
  }
}
