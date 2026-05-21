import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';
import { assertSupplierAndCategoryBelongToTenant } from './catalogService.js';

function productData(data) {
  return {
    ...(data.sku !== undefined ? { sku: data.sku } : {}),
    ...(data.barcode !== undefined ? { barcode: data.barcode } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
    ...(data.minSalePrice !== undefined ? { minSalePrice: data.minSalePrice } : {}),
    ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
    ...(data.reorderQuantity !== undefined ? { reorderQuantity: data.reorderQuantity } : {}),
    ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
    ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {})
  };
}

export async function createProduct({ tenantId, actorUserId, data }) {
  await assertSupplierAndCategoryBelongToTenant({ tenantId, supplierId: data.supplierId, categoryId: data.categoryId });

  if (data.minSalePrice > data.basePrice) {
    throw new AppError(400, 'INVALID_PRICE_RULE', 'Minimum sale price cannot be greater than base price.');
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      ...productData(data)
    }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: product.id,
    metadata: { sku: product.sku, barcode: product.barcode }
  });

  return product;
}

export async function updateProduct({ tenantId, actorUserId, productId, data }) {
  await assertSupplierAndCategoryBelongToTenant({ tenantId, supplierId: data.supplierId, categoryId: data.categoryId });

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');

  const nextBasePrice = data.basePrice ?? Number(product.basePrice);
  const nextMinSalePrice = data.minSalePrice ?? Number(product.minSalePrice);
  if (nextMinSalePrice > nextBasePrice) {
    throw new AppError(400, 'INVALID_PRICE_RULE', 'Minimum sale price cannot be greater than base price.');
  }

  const updated = await prisma.product.update({ where: { id: product.id }, data: productData(data) });
  await writeAuditLog({ tenantId, actorUserId, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: updated.id, metadata: data });

  return updated;
}

export async function archiveProduct({ tenantId, actorUserId, productId }) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');

  const activeBatchCount = await prisma.inventoryBatch.count({
    where: { tenantId, productId, status: 'ACTIVE', quantityOnHand: { gt: 0 } }
  });
  if (activeBatchCount > 0) {
    throw new AppError(409, 'PRODUCT_HAS_STOCK', 'Product with active stock cannot be archived.');
  }

  const updated = await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
  await writeAuditLog({ tenantId, actorUserId, action: 'PRODUCT_ARCHIVED', entityType: 'Product', entityId: updated.id, metadata: { sku: updated.sku } });

  return { message: 'Product archived.', product: updated };
}

export async function listProducts({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {})
    },
    ...cursorOptions
  });

  return formatCursorPage(items, limit);
}

export async function getProduct({ tenantId, productId }) {
  return prisma.product.findFirst({
    where: { tenantId, id: productId },
    include: {
      supplier: true,
      category: true,
      inventoryBatches: {
        select: {
          id: true,
          warehouseId: true,
          quantityOnHand: true,
          reservedQuantity: true,
          salePrice: true,
          receivedAt: true,
          expiryDate: true
        }
      }
    }
  });
}
