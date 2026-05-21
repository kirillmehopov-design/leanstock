import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { withRedisLock } from './lockService.js';
import { sendTransferApprovedEmail } from './notificationService.js';

function buildTransferLockKey({ tenantId, fromWarehouseId, items }) {
  const productPart = items.map((item) => item.productId).sort().join(':');
  return `lock:transfer:${tenantId}:${fromWarehouseId}:${productPart}`;
}

async function assertWarehouses(tx, tenantId, fromWarehouseId, toWarehouseId) {
  if (fromWarehouseId === toWarehouseId) {
    throw new AppError(400, 'INVALID_TRANSFER', 'Source and target warehouses must be different.');
  }

  const warehouses = await tx.warehouse.findMany({
    where: {
      tenantId,
      id: { in: [fromWarehouseId, toWarehouseId] },
      isActive: true
    }
  });

  if (warehouses.length !== 2) {
    throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Source or target warehouse was not found in this tenant.');
  }
}

async function assertProducts(tx, tenantId, items) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const productCount = await tx.product.count({
    where: {
      tenantId,
      id: { in: productIds },
      isActive: true
    }
  });

  if (productCount !== productIds.length) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One or more products were not found in this tenant.');
  }
}

async function allocateFromBatches(tx, { tenantId, productId, fromWarehouseId, toWarehouseId, requestedQuantity }) {
  let remaining = requestedQuantity;

  const sourceBatches = await tx.inventoryBatch.findMany({
    where: {
      tenantId,
      productId,
      warehouseId: fromWarehouseId,
      status: 'ACTIVE',
      quantityOnHand: { gt: 0 }
    },
    orderBy: { receivedAt: 'asc' }
  });

  for (const batch of sourceBatches) {
    if (remaining <= 0) break;

    const available = batch.quantityOnHand - batch.reservedQuantity;
    if (available <= 0) continue;

    const quantityToMove = Math.min(available, remaining);

    await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        quantityOnHand: { decrement: quantityToMove },
        status: batch.quantityOnHand - quantityToMove === 0 ? 'DEPLETED' : batch.status
      }
    });

    await tx.inventoryBatch.create({
      data: {
        tenantId,
        productId,
        warehouseId: toWarehouseId,
        quantityOnHand: quantityToMove,
        reservedQuantity: 0,
        unitCost: batch.unitCost,
        salePrice: batch.salePrice,
        minSalePrice: batch.minSalePrice,
        discountPercent: batch.discountPercent,
        receivedAt: batch.receivedAt,
        expiryDate: batch.expiryDate,
        lastDiscountAt: batch.lastDiscountAt,
        status: 'ACTIVE'
      }
    });

    remaining -= quantityToMove;
  }

  if (remaining > 0) {
    throw new AppError(409, 'INSUFFICIENT_STOCK', `Not enough available stock for product ${productId}.`);
  }
}

async function loadTransferForUpdate(tx, { tenantId, transferId }) {
  const transfer = await tx.stockTransfer.findFirst({
    where: { id: transferId, tenantId },
    include: { items: true }
  });

  if (!transfer) throw new AppError(404, 'TRANSFER_NOT_FOUND', 'Transfer was not found in this tenant.');
  return transfer;
}

function assertTransferStatus(transfer, allowedStatuses, nextAction) {
  if (!allowedStatuses.includes(transfer.status)) {
    throw new AppError(409, 'INVALID_TRANSFER_STATE', `Transfer must be ${allowedStatuses.join(' or ')} before ${nextAction}. Current status: ${transfer.status}.`);
  }
}

export async function createInventoryTransferRequest({ tenantId, actorUserId, fromWarehouseId, toWarehouseId, items }) {
  return prisma.$transaction(async (tx) => {
    await assertWarehouses(tx, tenantId, fromWarehouseId, toWarehouseId);
    await assertProducts(tx, tenantId, items);

    const transfer = await tx.stockTransfer.create({
      data: {
        tenantId,
        fromWarehouseId,
        toWarehouseId,
        requestedById: actorUserId,
        status: 'REQUESTED',
        items: {
          create: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        }
      },
      include: { items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_TRANSFER_REQUESTED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: { fromWarehouseId, toWarehouseId, items }
      }
    });

    return transfer;
  });
}

export async function approveTransfer({ tenantId, actorUserId, transferId }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await loadTransferForUpdate(tx, { tenantId, transferId });
    assertTransferStatus(transfer, ['REQUESTED'], 'approval');

    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'APPROVED' },
      include: { items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_TRANSFER_APPROVED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: { previousStatus: transfer.status }
      }
    });

    return updated;
  });
}

export async function dispatchTransfer({ tenantId, actorUserId, transferId }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await loadTransferForUpdate(tx, { tenantId, transferId });
    assertTransferStatus(transfer, ['APPROVED'], 'dispatch');

    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'IN_TRANSIT' },
      include: { items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_TRANSFER_IN_TRANSIT',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: { previousStatus: transfer.status }
      }
    });

    return updated;
  });
}

export async function receiveTransfer({ tenantId, actorUserId, transferId }) {
  const transferToReceive = await prisma.stockTransfer.findFirst({
    where: { id: transferId, tenantId },
    include: { items: true }
  });

  if (!transferToReceive) throw new AppError(404, 'TRANSFER_NOT_FOUND', 'Transfer was not found in this tenant.');
  assertTransferStatus(transferToReceive, ['IN_TRANSIT'], 'receipt');

  const lockKey = buildTransferLockKey({
    tenantId,
    fromWarehouseId: transferToReceive.fromWarehouseId,
    items: transferToReceive.items
  });

  const received = await withRedisLock(lockKey, 10000, async () => prisma.$transaction(async (tx) => {
    const transfer = await loadTransferForUpdate(tx, { tenantId, transferId });
    assertTransferStatus(transfer, ['IN_TRANSIT'], 'receipt');

    for (const item of transfer.items) {
      await allocateFromBatches(tx, {
        tenantId,
        productId: item.productId,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        requestedQuantity: item.quantity
      });
    }

    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'RECEIVED', completedAt: new Date() },
      include: {
        items: true,
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } }
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_TRANSFER_RECEIVED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: {
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          items: transfer.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        }
      }
    });

    return updated;
  }));

  await sendTransferApprovedEmail({
    tenantId,
    transferId: received.id,
    fromWarehouse: received.fromWarehouse?.name || received.fromWarehouseId,
    toWarehouse: received.toWarehouse?.name || received.toWarehouseId
  });

  return received;
}

export async function cancelTransfer({ tenantId, actorUserId, transferId, reason }) {
  return prisma.$transaction(async (tx) => {
    const transfer = await loadTransferForUpdate(tx, { tenantId, transferId });
    assertTransferStatus(transfer, ['REQUESTED', 'APPROVED'], 'cancellation');

    const updated = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: 'CANCELLED' },
      include: { items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_TRANSFER_CANCELLED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        metadata: { previousStatus: transfer.status, reason }
      }
    });

    return updated;
  });
}

export async function listTransfers({ tenantId, query = {} }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.stockTransfer.findMany({
    where: { tenantId },
    include: {
      items: true,
      fromWarehouse: { select: { id: true, name: true } },
      toWarehouse: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    ...cursorOptions
  });

  return formatCursorPage(items, limit);
}

export async function getTransfer({ tenantId, transferId }) {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { tenantId, id: transferId },
    include: {
      items: true,
      fromWarehouse: { select: { id: true, name: true } },
      toWarehouse: { select: { id: true, name: true } }
    }
  });

  if (!transfer) throw new AppError(404, 'TRANSFER_NOT_FOUND', 'Transfer was not found in this tenant.');
  return transfer;
}
