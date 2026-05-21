import { env } from '../config/env.js';

function htmlToText(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSmtpTransportOptions() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP email provider requires SMTP_HOST, SMTP_USER and SMTP_PASS.');
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  };
}

/**
 * Sends an email via the configured provider.
 * EMAIL_PROVIDER=mock   → logs to console, no real sending
 * EMAIL_PROVIDER=resend → sends real email via Resend HTTP API
 * EMAIL_PROVIDER=smtp   → sends real email via SMTP, for example Gmail App Password
 */
export async function sendEmail({ to, subject, html, text }) {
  const safeHtml = html || `<p>${text || ''}</p>`;
  const safeText = text || htmlToText(safeHtml);

  if (env.EMAIL_PROVIDER === 'mock') {
    console.log('[EMAIL MOCK]', { to, subject, text: safeText.slice(0, 120) + (safeText.length > 120 ? '...' : '') });
    return { provider: 'mock', to, subject };
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport(buildSmtpTransportOptions());

    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to,
      subject,
      text: safeText,
      html: safeHtml
    });

    return { provider: 'smtp', id: info.messageId, to, subject };
  }

  // Resend provider
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      html: safeHtml
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { provider: 'resend', id: data.id, to, subject };
}

export function buildVerificationEmail({ username, verifyUrl, token }) {
  return {
    subject: 'Verify your LeanStock account',
    html: `
      <h2>Hello, ${username}!</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:4px;text-decoration:none;">Verify Email</a></p>
      <p>You can also copy this verification token and paste it into the LeanStock frontend or Postman:</p>
      <p style="font-family:monospace;word-break:break-all;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px;color:#0f172a;">${token}</p>
      <p>Verification link: <a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This token expires in ${env.EMAIL_VERIFICATION_TOKEN_MINUTES} minutes.</p>
      <p>If you did not create a LeanStock account, ignore this email.</p>
    `,
    text: `Hello, ${username}! Verify your LeanStock account by opening this link: ${verifyUrl} Verification token: ${token} This token expires in ${env.EMAIL_VERIFICATION_TOKEN_MINUTES} minutes.`
  };
}

export function buildPasswordResetEmail({ username, resetUrl, token }) {
  return {
    subject: 'Reset your LeanStock password',
    html: `
      <h2>Hello, ${username}!</h2>
      <p>You requested a password reset. Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;border-radius:4px;text-decoration:none;">Reset Password</a></p>
      <p>You can also copy this reset token into the LeanStock frontend:</p>
      <p style="font-family:monospace;word-break:break-all;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px;color:#0f172a;">${token}</p>
      <p>This token expires in ${env.PASSWORD_RESET_TOKEN_MINUTES} minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
    text: `Hello, ${username}! Reset your LeanStock password by opening this link: ${resetUrl} Reset token: ${token} This token expires in ${env.PASSWORD_RESET_TOKEN_MINUTES} minutes.`
  };
}

export function buildLowStockAlertEmail({ username, tenantName, productName, warehouseName, quantityOnHand }) {
  return {
    subject: `Low stock alert: ${productName}`,
    html: `
      <h2>Low Stock Alert — ${tenantName}</h2>
      <p>Hello, ${username}!</p>
      <p>Product <strong>${productName}</strong> at warehouse <strong>${warehouseName}</strong>
         has reached a low stock level of <strong>${quantityOnHand}</strong> units.</p>
      <p>Please reorder soon to avoid stockouts.</p>
    `
  };
}

export function buildTransferApprovedEmail({ username, transferId, fromWarehouse, toWarehouse }) {
  return {
    subject: `Inventory transfer receipt — #${transferId.slice(0, 8)}`,
    html: `
      <h2>Inventory Transfer Receipt</h2>
      <p>Hello, ${username}!</p>
      <p>Your stock transfer from <strong>${fromWarehouse}</strong> to <strong>${toWarehouse}</strong>
         (ID: <code>${transferId}</code>) has been received and stock was moved between warehouses.</p>
    `
  };
}


export function buildPurchaseOrderConfirmationEmail({ username, purchaseOrderId, totalAmount }) {
  return {
    subject: `Purchase order confirmed — #${String(purchaseOrderId).slice(0, 8)}`,
    html: `
      <h2>Purchase Order Confirmed</h2>
      <p>Hello, ${username}!</p>
      <p>Purchase order <code>${purchaseOrderId}</code> has been confirmed.</p>
      <p>Total amount: <strong>${totalAmount}</strong></p>
    `
  };
}
