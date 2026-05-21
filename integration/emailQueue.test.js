import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { emailQueue } from '../../src/queues/emailQueue.js';
import { setupIntegration, teardownIntegration } from './setup.js';

async function verifyUserEmail(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  expect(user?.emailVerifyToken).toBeDefined();
  await request(app).get('/api/v1/auth/verify-email').query({ token: user.emailVerifyToken }).expect(200);
}

async function clearEmailJobs() {
  await emailQueue.drain(true);
  await emailQueue.clean(0, 1000, 'completed');
  await emailQueue.clean(0, 1000, 'failed');
  await emailQueue.clean(0, 1000, 'wait');
  await emailQueue.clean(0, 1000, 'delayed');
}

async function queuedJobs() {
  // When tests are executed with docker compose, the real worker container can
  // consume email jobs immediately. For test purposes we accept any BullMQ state
  // that proves the job was enqueued: waiting/delayed/active/completed/failed.
  return emailQueue.getJobs(['waiting', 'delayed', 'prioritized', 'active', 'completed', 'failed']);
}

async function createOwner(suffix) {
  const email = `email_owner_${suffix}@example.kz`;
  const response = await request(app).post('/api/v1/auth/register').send({
    email,
    username: `email_owner_${suffix}`,
    password: 'StrongPass123',
    tenantName: `Email Market ${suffix}`
  }).expect(201);
  await verifyUserEmail(email);
  return { email, token: response.body.accessToken, tenantId: response.body.tenantId };
}

async function prepareCatalog(owner, suffix) {
  const warehouseA = await request(app).post('/api/v1/warehouses')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: `Warehouse A ${suffix}` }).expect(201);

  const warehouseB = await request(app).post('/api/v1/warehouses')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: `Warehouse B ${suffix}` }).expect(201);

  const supplier = await request(app).post('/api/v1/catalog/suppliers')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: `Supplier ${suffix}`, email: `supplier_${suffix}@example.kz` }).expect(201);

  const product = await request(app).post('/api/v1/products')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ sku: `SKU-${suffix}`, name: `Product ${suffix}`, basePrice: 1000, minSalePrice: 700, reorderPoint: 5, supplierId: supplier.body.id })
    .expect(201);

  return { warehouseA: warehouseA.body, warehouseB: warehouseB.body, supplier: supplier.body, product: product.body };
}

describe('email queue requirements', () => {
  beforeAll(setupIntegration);
  afterAll(teardownIntegration);
  beforeEach(clearEmailJobs);

  test('registration enqueues a verify-email job', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'verify_queue@example.kz',
      username: 'verify_queue',
      password: 'StrongPass123',
      tenantName: 'Verify Queue Market'
    }).expect(201);

    const jobs = await queuedJobs();
    expect(jobs.some((job) => job.name === 'verify-email' && job.data.to === 'verify_queue@example.kz')).toBe(true);
  });

  test('password reset enqueues a password-reset job', async () => {
    const owner = await createOwner('reset');
    await clearEmailJobs();

    await request(app).post('/api/v1/auth/request-password-reset')
      .send({ email: owner.email })
      .expect(200);

    const jobs = await queuedJobs();
    expect(jobs.some((job) => job.name === 'password-reset' && job.data.to === owner.email)).toBe(true);
  });

  test('purchase order confirmation enqueues required business email', async () => {
    const owner = await createOwner('po');
    const { supplier, product } = await prepareCatalog(owner, 'po');
    await clearEmailJobs();

    const po = await request(app).post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 3, unitCost: 500 }] })
      .expect(201);

    await request(app).post(`/api/v1/purchase-orders/${po.body.id}/confirm`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send()
      .expect(200);

    const jobs = await queuedJobs();
    expect(jobs.some((job) => job.name === 'purchase-order-confirmation' && job.data.to === supplier.email)).toBe(true);
  });

  test('staff can execute transfer receipt, but only OWNER/MANAGER recipients get transfer email', async () => {
    const owner = await createOwner('transfer_email');
    const { warehouseA, warehouseB, product } = await prepareCatalog(owner, 'transfer_email');

    await request(app).post('/api/v1/inventory/batches')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ productId: product.id, warehouseId: warehouseA.id, quantityOnHand: 20, unitCost: 500, salePrice: 1000, minSalePrice: 700 })
      .expect(201);

    const staffEmail = 'staff_transfer_email@example.kz';
    await request(app).post('/api/v1/auth/register').send({
      email: staffEmail,
      username: 'staff_transfer_email',
      password: 'StrongPass123'
    }).expect(201);
    await verifyUserEmail(staffEmail);

    await request(app).post('/api/v1/memberships')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: staffEmail, role: 'STAFF' })
      .expect(201);

    const staffLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: staffEmail, password: 'StrongPass123' })
      .expect(200);

    const transfer = await request(app).post('/api/v1/transfers')
      .set('Authorization', `Bearer ${staffLogin.body.accessToken}`)
      .send({ fromWarehouseId: warehouseA.id, toWarehouseId: warehouseB.id, items: [{ productId: product.id, quantity: 4 }] })
      .expect(201);

    await request(app).post(`/api/v1/transfers/${transfer.body.id}/approve`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send()
      .expect(200);

    await request(app).post(`/api/v1/transfers/${transfer.body.id}/dispatch`)
      .set('Authorization', `Bearer ${staffLogin.body.accessToken}`)
      .send()
      .expect(200);

    await clearEmailJobs();
    await request(app).post(`/api/v1/transfers/${transfer.body.id}/receive`)
      .set('Authorization', `Bearer ${staffLogin.body.accessToken}`)
      .send()
      .expect(200);

    const jobs = await queuedJobs();
    expect(jobs.some((job) => job.name === 'transfer-approved' && job.data.to === owner.email)).toBe(true);
    expect(jobs.some((job) => job.name === 'transfer-approved' && job.data.to === staffEmail)).toBe(false);
  });
});
