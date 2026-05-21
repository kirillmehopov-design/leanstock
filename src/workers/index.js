/**
 * Worker entry-point — runs as a separate process via `npm run worker`.
 * Starts BullMQ workers for email and dead-stock queues.
 */
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { disconnectPrisma } from '../config/prisma.js';
import { startEmailWorker, stopEmailWorker } from '../jobs/emailWorker.js';
import { startDeadStockWorker, stopDeadStockWorker } from '../jobs/deadStockWorker.js';
import { startReservationExpiryWorker, stopReservationExpiryWorker } from '../jobs/reservationExpiryWorker.js';

async function bootstrap() {
  await connectRedis();
  startEmailWorker();
  startDeadStockWorker();
  startReservationExpiryWorker();
  console.log('[Workers] All workers started: email, dead-stock, reservation-expiry.');

  async function shutdown() {
    console.log('[Workers] Shutting down...');
    await Promise.all([stopEmailWorker(), stopDeadStockWorker()]);
    stopReservationExpiryWorker();
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(async (err) => {
  console.error('[Workers] Bootstrap failed:', err);
  await disconnectRedis();
  await disconnectPrisma();
  process.exit(1);
});
