import { app } from './app.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { disconnectPrisma } from './config/prisma.js';
import { startDeadStockWorker, stopDeadStockWorker } from './jobs/deadStockWorker.js';
import { startEmailWorker, stopEmailWorker } from './jobs/emailWorker.js';
import { startReservationExpiryWorker, stopReservationExpiryWorker } from './jobs/reservationExpiryWorker.js';

async function bootstrap() {
  await connectRedis();

  const server = app.listen(env.PORT, () => {
    console.log(`LeanStock API listening on port ${env.PORT}`);
    console.log(`Swagger UI: http://localhost:${env.PORT}/docs`);
  });

  if (env.ENABLE_WORKER) {
    startEmailWorker();
    startDeadStockWorker();
    startReservationExpiryWorker();
    console.log('LeanStock workers are running.');
  }

  async function shutdown() {
    console.log('Shutting down LeanStock API...');
    await Promise.all([stopEmailWorker(), stopDeadStockWorker()]);
    stopReservationExpiryWorker();
    server.close(async () => {
      await disconnectRedis();
      await disconnectPrisma();
      process.exit(0);
    });
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(async (error) => {
  console.error(error);
  await disconnectRedis();
  await disconnectPrisma();
  process.exit(1);
});
