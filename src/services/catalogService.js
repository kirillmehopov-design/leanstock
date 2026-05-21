import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { buildCursorOptions, formatCursorPage } from '../utils/pagination.js';
import { writeAuditLog } from './auditService.js';

export async function createSupplier({ tenantId, actorUserId, data }) {
  const supplier = await prisma.supplier.create({
    data: { tenantId, name: data.name, phone: data.phone, email: data.email }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'SUPPLIER_CREATED',
    entityType: 'Supplier',
    entityId: supplier.id,
    metadata: { name: supplier.name, email: supplier.email }
  });

  return supplier;
}

export async function listSuppliers({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.supplier.findMany({ where: { tenantId }, ...cursorOptions });
  return formatCursorPage(items, limit);
}

export async function createCategory({ tenantId, actorUserId, data }) {
  const category = await prisma.category.create({
    data: { tenantId, name: data.name }
  });

  await writeAuditLog({
    tenantId,
    actorUserId,
    action: 'CATEGORY_CREATED',
    entityType: 'Category',
    entityId: category.id,
    metadata: { name: category.name }
  });

  return category;
}

export async function listCategories({ tenantId, query }) {
  const { limit, ...cursorOptions } = buildCursorOptions(query);
  const items = await prisma.category.findMany({ where: { tenantId }, ...cursorOptions });
  return formatCursorPage(items, limit);
}

export async function assertSupplierAndCategoryBelongToTenant({ tenantId, supplierId, categoryId }) {
  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found in this tenant.');
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found in this tenant.');
  }
}
