import { prisma } from '../../src/config/prisma.js';
import { redis, connectRedis, disconnectRedis } from '../../src/config/redis.js';

export async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.inventoryIssueReport.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.reservationItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
}

export async function setupIntegration() {
  await connectRedis();
  await redis.flushDb();
  await resetDatabase();
}

export async function teardownIntegration() {
  await resetDatabase();
  await disconnectRedis();
  await prisma.$disconnect();
}
