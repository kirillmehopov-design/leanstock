import {
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildLowStockAlertEmail,
  buildTransferApprovedEmail
} from '../../src/services/emailService.js';

describe('buildVerificationEmail', () => {
  test('includes username and verifyUrl in html', () => {
    const { subject, html } = buildVerificationEmail({
      username: 'alice',
      verifyUrl: 'http://localhost:3000/api/v1/auth/verify-email?token=abc123',
      token: 'abc123'
    });
    expect(subject).toMatch(/verify/i);
    expect(html).toContain('alice');
    expect(html).toContain('abc123');
  });
});

describe('buildPasswordResetEmail', () => {
  test('includes username and resetUrl in html', () => {
    const { subject, html } = buildPasswordResetEmail({
      username: 'bob',
      resetUrl: 'http://localhost:3000/api/v1/auth/reset-password?token=xyz789',
      token: 'xyz789'
    });
    expect(subject).toMatch(/reset/i);
    expect(html).toContain('bob');
    expect(html).toContain('xyz789');
  });
});

describe('buildLowStockAlertEmail', () => {
  test('includes product and warehouse info', () => {
    const { subject, html } = buildLowStockAlertEmail({
      username: 'carol',
      tenantName: 'Acme Ltd',
      productName: 'Widget A',
      warehouseName: 'Main Warehouse',
      quantityOnHand: 3
    });
    expect(subject).toContain('Widget A');
    expect(html).toContain('Main Warehouse');
    expect(html).toContain('3');
  });
});

describe('buildTransferApprovedEmail', () => {
  test('includes transfer details', () => {
    const { subject, html } = buildTransferApprovedEmail({
      username: 'dave',
      transferId: 'transfer-uuid-0001',
      fromWarehouse: 'North',
      toWarehouse: 'South'
    });
    expect(subject).toContain('Inventory transfer receipt');
    expect(html).toContain('North');
    expect(html).toContain('South');
  });
});
