import { prisma } from '../config/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateDecayedPrice(currentPrice, minSalePrice, discountPercent = 10) {
  const multiplier = Math.max(0, 100 - discountPercent) / 100;
  const decayed = Number(currentPrice) * multiplier;
  return Math.max(Number(minSalePrice), Math.round(decayed * 100) / 100);
}

async function getTenantPolicy(tenantId) {
  if (!tenantId) {
    return { deadStockAgeDays: 30, deadStockDiscountPercent: 10, deadStockCooldownHours: 72 };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { deadStockAgeDays: true, deadStockDiscountPercent: true, deadStockCooldownHours: true }
  });

  return tenant || { deadStockAgeDays: 30, deadStockDiscountPercent: 10, deadStockCooldownHours: 72 };
}

export async function getDeadStockPolicy(tenantId) {
  const policy = await getTenantPolicy(tenantId);
  return {
    ageDays: policy.deadStockAgeDays,
    discountPercent: policy.deadStockDiscountPercent,
    cooldownHours: policy.deadStockCooldownHours
  };
}

export async function updateDeadStockPolicy({ tenantId, actorUserId, data }) {
  const previous = await getDeadStockPolicy(tenantId);
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.ageDays !== undefined ? { deadStockAgeDays: data.ageDays } : {}),
      ...(data.discountPercent !== undefined ? { deadStockDiscountPercent: data.discountPercent } : {}),
      ...(data.cooldownHours !== undefined ? { deadStockCooldownHours: data.cooldownHours } : {})
    },
    select: { id: true, deadStockAgeDays: true, deadStockDiscountPercent: true, deadStockCooldownHours: true }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action: 'DEAD_STOCK_POLICY_UPDATED',
      entityType: 'Tenant',
      entityId: tenantId,
      metadata: { previous, next: await getDeadStockPolicy(tenantId) }
    }
  });

  return {
    tenantId: updated.id,
    ageDays: updated.deadStockAgeDays,
    discountPercent: updated.deadStockDiscountPercent,
    cooldownHours: updated.deadStockCooldownHours
  };
}

function isEligibleForDecay(batch, now, policy) {
  const ageDays = (now.getTime() - batch.receivedAt.getTime()) / DAY_MS;

  if (ageDays <= policy.deadStockAgeDays) return false;
  if (Number(batch.salePrice) <= Number(batch.minSalePrice)) return false;
  if (!batch.lastDiscountAt) return true;

  const hoursSinceLastDiscount = (now.getTime() - batch.lastDiscountAt.getTime()) / (60 * 60 * 1000);
  return hoursSinceLastDiscount >= policy.deadStockCooldownHours;
}

export async function runDeadStockDecay(now = new Date(), tenantId = undefined) {
  const policy = await getTenantPolicy(tenantId);
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      status: 'ACTIVE',
      quantityOnHand: { gt: 0 },
      receivedAt: { lt: new Date(now.getTime() - policy.deadStockAgeDays * DAY_MS) }
    }
  });

  let updatedCount = 0;

  for (const batch of batches) {
    if (!isEligibleForDecay(batch, now, policy)) continue;

    const newPrice = calculateDecayedPrice(batch.salePrice, batch.minSalePrice, policy.deadStockDiscountPercent);
    const newDiscount = Math.min(batch.discountPercent + policy.deadStockDiscountPercent, 90);

    await prisma.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        salePrice: newPrice,
        discountPercent: newDiscount,
        lastDiscountAt: now
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: batch.tenantId,
        action: 'DEAD_STOCK_DECAY_APPLIED',
        entityType: 'InventoryBatch',
        entityId: batch.id,
        metadata: {
          oldPrice: Number(batch.salePrice),
          newPrice,
          discountPercent: newDiscount,
          policy: {
            ageDays: policy.deadStockAgeDays,
            discountPercent: policy.deadStockDiscountPercent,
            cooldownHours: policy.deadStockCooldownHours
          }
        }
      }
    });

    updatedCount += 1;
  }

  return { updatedCount, policy: await getDeadStockPolicy(tenantId) };
}
