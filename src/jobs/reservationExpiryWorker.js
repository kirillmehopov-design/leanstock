import { prisma } from '../config/prisma.js';

let expiryIntervalId;

async function expireReservations() {
  const now = new Date();

  // Find all reservations that are ACTIVE but past their expiresAt
  const expired = await prisma.reservation.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: now }
    },
    include: { items: true }
  });

  if (expired.length === 0) return;

  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Release reserved stock for each item
        for (const item of reservation.items) {
          const batches = await tx.inventoryBatch.findMany({
            where: {
              tenantId: reservation.tenantId,
              warehouseId: reservation.warehouseId,
              productId: item.productId,
              reservedQuantity: { gt: 0 }
            },
            orderBy: { receivedAt: 'asc' }
          });

          let remaining = item.quantity;
          for (const batch of batches) {
            if (remaining <= 0) break;
            const release = Math.min(batch.reservedQuantity, remaining);
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { reservedQuantity: { decrement: release } }
            });
            remaining -= release;
          }
        }

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'EXPIRED' }
        });

        await tx.auditLog.create({
          data: {
            tenantId: reservation.tenantId,
            action: 'RESERVATION_EXPIRED',
            entityType: 'Reservation',
            entityId: reservation.id,
            metadata: { expiredAt: now.toISOString() }
          }
        });
      });

      console.log(`[ReservationExpiry] Expired reservation ${reservation.id}`);
    } catch (err) {
      console.error(`[ReservationExpiry] Failed to expire reservation ${reservation.id}:`, err.message);
    }
  }

  console.log(`[ReservationExpiry] Processed ${expired.length} expired reservation(s).`);
}

export function startReservationExpiryWorker() {
  // Run immediately on startup, then every 60 seconds
  expireReservations().catch((err) => console.error('[ReservationExpiry] Initial run failed:', err.message));
  expiryIntervalId = setInterval(() => {
    expireReservations().catch((err) => console.error('[ReservationExpiry] Run failed:', err.message));
  }, 60 * 1000);

  console.log('[ReservationExpiry] Started — checking every 60s.');
}

export function stopReservationExpiryWorker() {
  if (expiryIntervalId) {
    clearInterval(expiryIntervalId);
    expiryIntervalId = null;
  }
}
