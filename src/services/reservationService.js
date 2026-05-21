import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { withRedisLock } from './lockService.js';
import { env } from '../config/env.js';

function lockKey({ tenantId, warehouseId, items }) {
  return `lock:reservation:${tenantId}:${warehouseId}:${items.map((item) => item.productId).sort().join(':')}`;
}

async function assertWarehouse(tx, tenantId, warehouseId) {
  const warehouse = await tx.warehouse.findFirst({ where: { id: warehouseId, tenantId, isActive: true } });
  if (!warehouse) throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse was not found in this tenant.');
}

async function reserveStock(tx, { tenantId, warehouseId, productId, quantity }) {
  let remaining = quantity;
  const batches = await tx.inventoryBatch.findMany({
    where: { tenantId, warehouseId, productId, status: 'ACTIVE', quantityOnHand: { gt: 0 } },
    orderBy: { receivedAt: 'asc' }
  });

  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = batch.quantityOnHand - batch.reservedQuantity;
    if (available <= 0) continue;
    const reserveQuantity = Math.min(available, remaining);
    await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: { reservedQuantity: { increment: reserveQuantity } }
    });
    remaining -= reserveQuantity;
  }

  if (remaining > 0) {
    throw new AppError(409, 'INSUFFICIENT_STOCK', `Not enough stock to reserve product ${productId}.`);
  }
}

async function releaseReservedStock(tx, { tenantId, warehouseId, items }) {
  for (const item of items) {
    let remaining = item.quantity;
    const batches = await tx.inventoryBatch.findMany({
      where: { tenantId, warehouseId, productId: item.productId, status: 'ACTIVE', reservedQuantity: { gt: 0 } },
      orderBy: { receivedAt: 'asc' }
    });

    for (const batch of batches) {
      if (remaining <= 0) break;
      const releaseQuantity = Math.min(batch.reservedQuantity, remaining);
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { reservedQuantity: { decrement: releaseQuantity } }
      });
      remaining -= releaseQuantity;
    }
  }
}

async function consumeReservedStock(tx, { tenantId, warehouseId, items }) {
  let totalAmount = 0;
  const saleItems = [];

  for (const item of items) {
    let remaining = item.quantity;
    const product = await tx.product.findFirst({ where: { id: item.productId, tenantId, isActive: true } });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${item.productId} was not found.`);

    const batches = await tx.inventoryBatch.findMany({
      where: { tenantId, warehouseId, productId: item.productId, status: 'ACTIVE', reservedQuantity: { gt: 0 } },
      orderBy: { receivedAt: 'asc' }
    });

    for (const batch of batches) {
      if (remaining <= 0) break;
      const quantityToSell = Math.min(batch.reservedQuantity, remaining);
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          reservedQuantity: { decrement: quantityToSell },
          quantityOnHand: { decrement: quantityToSell }
        }
      });
      totalAmount += Number(batch.salePrice) * quantityToSell;
      remaining -= quantityToSell;
    }

    if (remaining > 0) {
      throw new AppError(409, 'RESERVATION_CORRUPTED', `Reserved stock is not sufficient for product ${item.productId}.`);
    }

    saleItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice ?? product.basePrice });
  }

  return { totalAmount, saleItems };
}

export async function createReservation({ tenantId, actorUserId, data }) {
  if (data.idempotencyKey) {
    const existing = await prisma.reservation.findFirst({
      where: { tenantId, idempotencyKey: data.idempotencyKey },
      include: { items: true }
    });
    if (existing) return existing;
  }

  const key = lockKey({ tenantId, warehouseId: data.warehouseId, items: data.items });

  return withRedisLock(key, 10000, async () => prisma.$transaction(async (tx) => {
    await assertWarehouse(tx, tenantId, data.warehouseId);
    const productCount = await tx.product.count({
      where: { tenantId, id: { in: data.items.map((item) => item.productId) }, isActive: true }
    });
    if (productCount !== new Set(data.items.map((item) => item.productId)).size) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One or more products were not found in this tenant.');
    }

    for (const item of data.items) {
      await reserveStock(tx, { tenantId, warehouseId: data.warehouseId, productId: item.productId, quantity: item.quantity });
    }

    const reservation = await tx.reservation.create({
      data: {
        tenantId,
        warehouseId: data.warehouseId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60 * 1000),
        idempotencyKey: data.idempotencyKey,
        items: { create: data.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) }
      },
      include: { items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: reservation.id,
        metadata: { warehouseId: data.warehouseId, items: data.items }
      }
    });

    return reservation;
  }));
}

export async function cancelReservation({ tenantId, actorUserId, reservationId }) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { items: true }
    });
    if (!reservation) throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reservation was not found.');
    if (reservation.status !== 'ACTIVE') throw new AppError(409, 'RESERVATION_NOT_ACTIVE', 'Only active reservations can be cancelled.');

    await releaseReservedStock(tx, { tenantId, warehouseId: reservation.warehouseId, items: reservation.items });
    const updated = await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CANCELLED' }, include: { items: true } });
    await tx.auditLog.create({ data: { tenantId, actorUserId, action: 'RESERVATION_CANCELLED', entityType: 'Reservation', entityId: reservation.id } });
    return updated;
  });
}

export async function confirmReservation({ tenantId, actorUserId, reservationId }) {
  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { items: true }
    });
    if (!reservation) throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reservation was not found.');
    if (reservation.status !== 'ACTIVE') throw new AppError(409, 'RESERVATION_NOT_ACTIVE', 'Only active reservations can be confirmed.');
    if (reservation.expiresAt < new Date()) throw new AppError(409, 'RESERVATION_EXPIRED', 'Reservation has expired.');

    const { totalAmount, saleItems } = await consumeReservedStock(tx, {
      tenantId,
      warehouseId: reservation.warehouseId,
      items: reservation.items
    });

    const sale = await tx.sale.create({
      data: {
        tenantId,
        warehouseId: reservation.warehouseId,
        createdById: actorUserId,
        totalAmount,
        items: {
          create: saleItems.map((item) => ({
            tenantId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: { items: true }
    });

    await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CONFIRMED' } });
    await tx.auditLog.create({
      data: { tenantId, actorUserId, action: 'RESERVATION_CONFIRMED_SALE_CREATED', entityType: 'Sale', entityId: sale.id, metadata: { reservationId } }
    });
    return { reservationId, sale, reservation };
  });

  return { reservationId: result.reservationId, sale: result.sale };
}

export async function listReservations({ tenantId }) {
  return prisma.reservation.findMany({
    where: { tenantId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}
