import { prisma } from '../config/prisma.js';
import { enqueueEmail } from '../queues/emailQueue.js';



/**
 * Notify all OWNER members of a tenant.
 * Uses named job types so the email worker renders proper templates.
 */
export async function notifyTenantOwners({ tenantId, jobName = 'purchase-order-confirmation', payload = {} }) {
  const owners = await prisma.membership.findMany({
    where: { tenantId, role: 'OWNER' },
    include: { user: { select: { email: true, username: true, emailVerified: true } } }
  });

  await Promise.all(
    owners
      .filter((m) => m.user.emailVerified)
      .map((m) => enqueueEmail(jobName, {
        to: m.user.email,
        username: m.user.username,
        subject: payload.subject ?? 'LeanStock notification',
        html: payload.html ?? '<p>LeanStock notification.</p>',
        ...payload
      }))
  );
}

/**
 * Business event 1: low-stock alert.
 */
export async function sendLowStockAlert({ tenantId, productName, warehouseName, quantityOnHand }) {
  const recipients = await prisma.membership.findMany({
    where: { tenantId, role: { in: ['MANAGER', 'OWNER'] } },
    include: { user: { select: { email: true, username: true, emailVerified: true } } },
    orderBy: { role: 'asc' }
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  await Promise.all(
    recipients
      .filter((m) => m.user.emailVerified)
      .map((m) =>
        enqueueEmail('low-stock-alert', {
          to: m.user.email,
          username: m.user.username,
          tenantName: tenant?.name ?? tenantId,
          productName,
          warehouseName,
          quantityOnHand
        })
      )
  );
}

/**
 * Business event 2: inventory transfer receipt.
 * Strict LeanStock requirement: notify tenant OWNER/MANAGER recipients.
 * STAFF can execute warehouse operations, but should not receive management email alerts.
 */
export async function sendTransferApprovedEmail({ tenantId, transferId, fromWarehouse, toWarehouse }) {
  const recipients = await prisma.membership.findMany({
    where: { tenantId, role: { in: ['OWNER', 'MANAGER'] } },
    include: { user: { select: { email: true, username: true, emailVerified: true } } }
  });

  const unique = new Map();
  for (const membership of recipients) {
    if (membership.user.emailVerified) unique.set(membership.user.email, membership.user);
  }

  await Promise.all([...unique.values()].map((user) => enqueueEmail('transfer-approved', {
    to: user.email,
    username: user.username,
    transferId,
    fromWarehouse,
    toWarehouse
  })));
}


/**
 * Business event 3: purchase order confirmation — supplier/owner notification.
 */
export async function sendPurchaseOrderConfirmationEmail({ tenantId, supplierEmail, purchaseOrderId, totalAmount }) {
  if (supplierEmail) {
    await enqueueEmail('purchase-order-confirmation', {
      to: supplierEmail,
      username: 'Supplier',
      purchaseOrderId,
      totalAmount
    });
    return;
  }

  await notifyTenantOwners({
    tenantId,
    jobName: 'purchase-order-confirmation',
    payload: {
      purchaseOrderId,
      totalAmount
    }
  });
}
