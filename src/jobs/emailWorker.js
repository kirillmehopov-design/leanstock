import { Worker } from 'bullmq';
import { bullMQConnection } from '../queues/connection.js';
import {
  sendEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildLowStockAlertEmail,
  buildTransferApprovedEmail,
  buildPurchaseOrderConfirmationEmail
} from '../services/emailService.js';

function buildEmailPayload(jobName, data) {
  switch (jobName) {
    case 'verify-email':
      return { to: data.to, ...buildVerificationEmail(data) };
    case 'password-reset':
      return { to: data.to, ...buildPasswordResetEmail(data) };
    case 'low-stock-alert':
      return { to: data.to, ...buildLowStockAlertEmail(data) };
    case 'transfer-approved':
      return { to: data.to, ...buildTransferApprovedEmail(data) };
    case 'purchase-order-confirmation':
      return { to: data.to, ...buildPurchaseOrderConfirmationEmail(data) };
    default:
      // Generic email job
      return { to: data.to, subject: data.subject, html: data.html };
  }
}

let emailWorkerInstance;

export function startEmailWorker() {
  emailWorkerInstance = new Worker(
    'email',
    async (job) => {
      const payload = buildEmailPayload(job.name, job.data);
      await sendEmail(payload);
      console.log(`[EmailWorker] Sent "${job.name}" to ${payload.to}`);
    },
    {
      connection: bullMQConnection,
      concurrency: 5
    }
  );

  emailWorkerInstance.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[EmailWorker] Started');
}

export function stopEmailWorker() {
  return emailWorkerInstance?.close();
}
