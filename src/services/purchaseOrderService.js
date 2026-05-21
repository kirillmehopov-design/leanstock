import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';
import { sendPurchaseOrderConfirmationEmail } from './notificationService.js';

function totalAmount(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

export async function createPurchaseOrder({ tenantId, actorUserId, data }) {
  const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, tenantId } });
  if (!supplier) throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found in this tenant.');

  const productIds = [...new Set(data.items.map((item) => item.productId))];
  const productCount = await prisma.product.count({ where: { tenantId, id: { in: productIds }, isActive: true } });
  if (productCount !== productIds.length) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'One or more products were not found in this tenant.');

  const po = await prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: data.supplierId,
        createdById: actorUserId,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : undefined,
        totalAmount: totalAmount(data.items),
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            tenantId,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost
          }))
        }
      },
      include: { items: true, supplier: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'PURCHASE_ORDER_CREATED',
        entityType: 'PurchaseOrder',
        entityId: purchaseOrder.id,
        metadata: { supplierId: data.supplierId, items: data.items }
      }
    });

    return purchaseOrder;
  });

  return po;
}

export async function confirmPurchaseOrder({ tenantId, actorUserId, purchaseOrderId }) {
  const po = await prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      include: { supplier: true, items: true }
    });
    if (!purchaseOrder) throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order was not found.');
    if (purchaseOrder.status === 'CANCELLED') throw new AppError(409, 'PURCHASE_ORDER_CANCELLED', 'Cancelled purchase order cannot be confirmed.');
    if (purchaseOrder.status === 'CONFIRMED') return purchaseOrder;

    const updated = await tx.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: { supplier: true, items: true }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action: 'PURCHASE_ORDER_CONFIRMED',
        entityType: 'PurchaseOrder',
        entityId: updated.id,
        metadata: { supplierId: updated.supplierId, totalAmount: Number(updated.totalAmount) }
      }
    });

    return updated;
  });

  await sendPurchaseOrderConfirmationEmail({
    tenantId,
    supplierEmail: po.supplier.email,
    purchaseOrderId: po.id,
    totalAmount: po.totalAmount
  });

  return po;
}

export async function cancelPurchaseOrder({ tenantId, actorUserId, purchaseOrderId }) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, tenantId } });
  if (!po) throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order was not found.');
  if (po.status === 'CONFIRMED') throw new AppError(409, 'PURCHASE_ORDER_CONFIRMED', 'Confirmed purchase order cannot be cancelled.');
  const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: 'CANCELLED' }, include: { items: true, supplier: true } });
  await writeAuditLog({ tenantId, actorUserId, action: 'PURCHASE_ORDER_CANCELLED', entityType: 'PurchaseOrder', entityId: updated.id, metadata: {} });
  return updated;
}

export async function listPurchaseOrders({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.purchaseOrder.findMany({
    where: { tenantId, ...(query.status ? { status: query.status } : {}) },
    include: { supplier: true, items: true },
    ...cursorOptions
  });
  return formatCursorPage(items, limit);
}

export async function getPurchaseOrder({ tenantId, purchaseOrderId }) {
  return prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, tenantId },
    include: { supplier: true, items: { include: { product: true } } }
  });
}
