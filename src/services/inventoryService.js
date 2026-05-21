import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';
import { sendLowStockAlert } from './notificationService.js';

export async function receiveBatch({ tenantId, actorUserId, data }) {
  const product = await prisma.product.findFirst({ where: { id: data.productId, tenantId, isActive: true } });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found in this tenant.');

  const warehouse = await prisma.warehouse.findFirst({ where: { id: data.warehouseId, tenantId, isActive: true } });
  if (!warehouse) throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse was not found in this tenant.');

  if (data.minSalePrice > data.salePrice) {
    throw new AppError(400, 'INVALID_PRICE_RULE', 'Minimum sale price cannot be greater than sale price.');
  }

  const batch = await prisma.inventoryBatch.create({
    data: {
      tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      status: 'ACTIVE',
      quantityOnHand: data.quantityOnHand,
      unitCost: data.unitCost,
      salePrice: data.salePrice,
      minSalePrice: data.minSalePrice,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined
    }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'INVENTORY_BATCH_RECEIVED',
    entityType: 'InventoryBatch',
    entityId: batch.id,
    metadata: { productId: data.productId, warehouseId: data.warehouseId, quantityOnHand: data.quantityOnHand }
  });

  const totalAvailable = await availableQuantityForProduct({ tenantId, productId: data.productId });
  if (totalAvailable <= product.reorderPoint) {
    await sendLowStockAlert({ tenantId, productName: product.name, warehouseName: warehouse.name, quantityOnHand: totalAvailable });
  }

  return batch;
}

async function availableQuantityForProduct({ tenantId, productId }) {
  const batches = await prisma.inventoryBatch.findMany({
    where: { tenantId, productId, status: 'ACTIVE' },
    select: { quantityOnHand: true, reservedQuantity: true }
  });
  return batches.reduce((sum, batch) => sum + batch.quantityOnHand - batch.reservedQuantity, 0);
}

export async function adjustInventory({ tenantId, actorUserId, data }) {
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.findFirst({ where: { id: data.batchId, tenantId, status: 'ACTIVE' } });
    if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Inventory batch was not found in this tenant.');
    if (data.newQuantityOnHand < batch.reservedQuantity) {
      throw new AppError(409, 'RESERVED_STOCK_CONFLICT', 'New quantity cannot be lower than reserved quantity.');
    }

    const updated = await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        quantityOnHand: data.newQuantityOnHand,
        status: data.newQuantityOnHand === 0 ? 'DEPLETED' : batch.status
      }
    });

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        batchId: batch.id,
        productId: batch.productId,
        actorUserId,
        oldQuantity: batch.quantityOnHand,
        newQuantity: data.newQuantityOnHand,
        reason: data.reason,
        note: data.note
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_ADJUSTED',
        entityType: 'InventoryAdjustment',
        entityId: adjustment.id,
        metadata: { batchId: batch.id, oldQuantity: batch.quantityOnHand, newQuantity: data.newQuantityOnHand, reason: data.reason }
      }
    });

    return { batch: updated, adjustment };
  });

  return result;
}

export async function lowStockReport({ tenantId }) {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: { inventoryBatches: { where: { status: 'ACTIVE' }, select: { quantityOnHand: true, reservedQuantity: true } } }
  });

  return products
    .map((product) => {
      const availableQuantity = product.inventoryBatches.reduce((sum, batch) => sum + batch.quantityOnHand - batch.reservedQuantity, 0);
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        reorderPoint: product.reorderPoint,
        reorderQuantity: product.reorderQuantity,
        availableQuantity,
        shortage: Math.max(product.reorderPoint - availableQuantity, 0),
        isLowStock: availableQuantity <= product.reorderPoint
      };
    })
    .filter((item) => item.isLowStock)
    .sort((a, b) => b.shortage - a.shortage);
}

export async function deadStockReport({ tenantId, now = new Date() }) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const batches = await prisma.inventoryBatch.findMany({
    where: { tenantId, status: 'ACTIVE', receivedAt: { lt: cutoff }, quantityOnHand: { gt: 0 } },
    include: { product: { select: { sku: true, name: true, minSalePrice: true } }, warehouse: { select: { name: true } } },
    orderBy: { receivedAt: 'asc' },
    take: 100
  });
  return batches.map((batch) => ({
    batchId: batch.id,
    productId: batch.productId,
    sku: batch.product.sku,
    productName: batch.product.name,
    warehouseId: batch.warehouseId,
    warehouseName: batch.warehouse.name,
    quantityOnHand: batch.quantityOnHand,
    reservedQuantity: batch.reservedQuantity,
    availableQuantity: batch.quantityOnHand - batch.reservedQuantity,
    receivedAt: batch.receivedAt,
    salePrice: batch.salePrice,
    minSalePrice: batch.minSalePrice,
    lastDiscountAt: batch.lastDiscountAt
  }));
}

export async function inventorySnapshot({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: {
      inventoryBatches: {
        where: { status: 'ACTIVE' },
        select: { warehouseId: true, quantityOnHand: true, reservedQuantity: true, salePrice: true, receivedAt: true }
      }
    },
    ...cursorOptions
  });
  const mapped = items.map((product) => ({
    productId: product.id,
    sku: product.sku,
    name: product.name,
    totalOnHand: product.inventoryBatches.reduce((sum, b) => sum + b.quantityOnHand, 0),
    totalReserved: product.inventoryBatches.reduce((sum, b) => sum + b.reservedQuantity, 0),
    totalAvailable: product.inventoryBatches.reduce((sum, b) => sum + b.quantityOnHand - b.reservedQuantity, 0),
    batches: product.inventoryBatches
  }));
  return formatCursorPage(mapped, limit);
}

export async function forecastReorderSuggestions({ tenantId }) {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: { inventoryBatches: { where: { status: 'ACTIVE' }, select: { quantityOnHand: true, reservedQuantity: true } } }
  });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const saleItems = await prisma.saleItem.findMany({
    where: { tenantId, sale: { status: 'COMPLETED', createdAt: { gte: since } } },
    select: { productId: true, quantity: true }
  });
  const soldByProduct = saleItems.reduce((acc, item) => {
    acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
    return acc;
  }, {});

  return products.map((product) => {
    const availableQuantity = product.inventoryBatches.reduce((sum, b) => sum + b.quantityOnHand - b.reservedQuantity, 0);
    const soldLast30Days = soldByProduct[product.id] ?? 0;
    const averageDailySales = Math.round((soldLast30Days / 30) * 100) / 100;
    const daysOfCover = averageDailySales > 0 ? Math.round((availableQuantity / averageDailySales) * 10) / 10 : null;
    const suggestedReorderQuantity = product.reorderQuantity > 0
      ? product.reorderQuantity
      : Math.max(product.reorderPoint * 2 - availableQuantity, 0);
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      availableQuantity,
      reorderPoint: product.reorderPoint,
      reorderQuantity: product.reorderQuantity,
      soldLast30Days,
      averageDailySales,
      daysOfCover,
      shouldReorder: availableQuantity <= product.reorderPoint || (daysOfCover !== null && daysOfCover <= 7),
      suggestedReorderQuantity
    };
  }).filter((item) => item.shouldReorder).sort((a, b) => (a.daysOfCover ?? 9999) - (b.daysOfCover ?? 9999));
}

export async function reportInventoryIssue({ tenantId, actorUserId, data }) {
  const batch = await prisma.inventoryBatch.findFirst({
    where: { id: data.batchId, tenantId, status: 'ACTIVE' },
    include: { product: { select: { id: true, name: true, sku: true } } }
  });

  if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Inventory batch was not found in this tenant.');
  if (data.proposedQuantity < batch.reservedQuantity) {
    throw new AppError(409, 'RESERVED_STOCK_CONFLICT', 'Proposed quantity cannot be lower than reserved quantity.');
  }

  const report = await prisma.inventoryIssueReport.create({
    data: {
      tenantId,
      batchId: batch.id,
      productId: batch.productId,
      reportedById: actorUserId,
      oldQuantity: batch.quantityOnHand,
      proposedQuantity: data.proposedQuantity,
      reason: data.reason,
      note: data.note
    },
    include: { product: { select: { id: true, sku: true, name: true } } }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'INVENTORY_ISSUE_REPORTED',
    entityType: 'InventoryIssueReport',
    entityId: report.id,
    metadata: {
      batchId: batch.id,
      productId: batch.productId,
      oldQuantity: batch.quantityOnHand,
      proposedQuantity: data.proposedQuantity,
      reason: data.reason
    }
  });

  return report;
}

export async function listInventoryIssueReports({ tenantId, query = {} }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.inventoryIssueReport.findMany({
    where: { tenantId },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      batch: { select: { id: true, warehouseId: true, quantityOnHand: true, reservedQuantity: true } },
      reportedBy: { select: { id: true, email: true, username: true } }
    },
    orderBy: { createdAt: 'desc' },
    ...cursorOptions
  });

  return formatCursorPage(items, limit);
}


export async function getInventoryIssueReport({ tenantId, reportId }) {
  const report = await prisma.inventoryIssueReport.findFirst({
    where: { tenantId, id: reportId },
    include: {
      product: { select: { id: true, sku: true, name: true } },
      batch: { select: { id: true, warehouseId: true, quantityOnHand: true, reservedQuantity: true } },
      reportedBy: { select: { id: true, email: true, username: true } }
    }
  });

  if (!report) throw new AppError(404, 'ISSUE_REPORT_NOT_FOUND', 'Inventory issue report was not found.');
  return report;
}

export async function approveInventoryIssueReport({ tenantId, actorUserId, reportId, resolutionNote }) {
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.inventoryIssueReport.findFirst({
      where: { id: reportId, tenantId },
      include: { batch: true }
    });

    if (!report) throw new AppError(404, 'ISSUE_REPORT_NOT_FOUND', 'Inventory issue report was not found.');
    if (report.status !== 'PENDING') throw new AppError(409, 'ISSUE_REPORT_ALREADY_RESOLVED', 'Only pending reports can be approved.');
    if (report.proposedQuantity < report.batch.reservedQuantity) {
      throw new AppError(409, 'RESERVED_STOCK_CONFLICT', 'Approved quantity cannot be lower than reserved quantity.');
    }

    const updatedBatch = await tx.inventoryBatch.update({
      where: { id: report.batchId },
      data: {
        quantityOnHand: report.proposedQuantity,
        status: report.proposedQuantity === 0 ? 'DEPLETED' : report.batch.status
      }
    });

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        batchId: report.batchId,
        productId: report.productId,
        actorUserId,
        oldQuantity: report.oldQuantity,
        newQuantity: report.proposedQuantity,
        reason: report.reason,
        note: resolutionNote || report.note
      }
    });

    const updatedReport = await tx.inventoryIssueReport.update({
      where: { id: report.id },
      data: {
        status: 'APPROVED',
        resolvedById: actorUserId,
        resolutionNote,
        resolvedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_ISSUE_APPROVED',
        entityType: 'InventoryIssueReport',
        entityId: report.id,
        metadata: {
          adjustmentId: adjustment.id,
          batchId: report.batchId,
          oldQuantity: report.oldQuantity,
          newQuantity: report.proposedQuantity,
          reason: report.reason
        }
      }
    });

    return { report: updatedReport, batch: updatedBatch, adjustment };
  });

  return result;
}

export async function rejectInventoryIssueReport({ tenantId, actorUserId, reportId, resolutionNote }) {
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.inventoryIssueReport.findFirst({ where: { id: reportId, tenantId } });
    if (!report) throw new AppError(404, 'ISSUE_REPORT_NOT_FOUND', 'Inventory issue report was not found.');
    if (report.status !== 'PENDING') throw new AppError(409, 'ISSUE_REPORT_ALREADY_RESOLVED', 'Only pending reports can be rejected.');

    const updatedReport = await tx.inventoryIssueReport.update({
      where: { id: report.id },
      data: {
        status: 'REJECTED',
        resolvedById: actorUserId,
        resolutionNote,
        resolvedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'INVENTORY_ISSUE_REJECTED',
        entityType: 'InventoryIssueReport',
        entityId: report.id,
        metadata: { reason: report.reason, resolutionNote }
      }
    });

    return updatedReport;
  });

  return result;
}
