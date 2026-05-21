import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { setupIntegration, teardownIntegration } from './setup.js';

async function verifyUserEmail(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  expect(user?.emailVerifyToken).toBeDefined();

  await request(app)
    .get('/api/v1/auth/verify-email')
    .query({ token: user.emailVerifyToken })
    .expect(200);
}

async function bootstrapTenant(suffix = Math.random().toString(36).slice(2, 8)) {
  const email = `transfer_${suffix}@example.kz`;
  const registerResponse = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email,
      username: `transfer_owner_${suffix}`,
      password: 'StrongPass123',
      tenantName: 'Transfer Market'
    })
    .expect(201);

  await verifyUserEmail(email);

  const auth = {
    token: registerResponse.body.accessToken,
    tenantId: registerResponse.body.tenantId
  };

  const warehouseA = await request(app)
    .post('/api/v1/warehouses')
    .set('Authorization', `Bearer ${auth.token}`)
        .send({ name: 'Warehouse A' })
    .expect(201);

  const warehouseB = await request(app)
    .post('/api/v1/warehouses')
    .set('Authorization', `Bearer ${auth.token}`)
        .send({ name: 'Warehouse B' })
    .expect(201);

  const product = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${auth.token}`)
        .send({
      sku: 'RICE-1KG',
      name: 'Rice 1kg',
      basePrice: 900,
      minSalePrice: 700,
      reorderPoint: 5
    })
    .expect(201);

  await request(app)
    .post('/api/v1/inventory/batches')
    .set('Authorization', `Bearer ${auth.token}`)
        .send({
      productId: product.body.id,
      warehouseId: warehouseA.body.id,
      quantityOnHand: 20,
      unitCost: 600,
      salePrice: 900,
      minSalePrice: 700
    })
    .expect(201);

  return {
    auth,
    warehouseA: warehouseA.body,
    warehouseB: warehouseB.body,
    product: product.body
  };
}

describe('inventory transfer', () => {
  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  test('transfers stock atomically between warehouses', async () => {
    const data = await bootstrapTenant();

    const transfer = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send({
        fromWarehouseId: data.warehouseA.id,
        toWarehouseId: data.warehouseB.id,
        items: [{ productId: data.product.id, quantity: 7 }]
      })
      .expect(201);

    expect(transfer.body.status).toBe('REQUESTED');

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/approve`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(200);

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/dispatch`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(200);

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/receive`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(200);

    const batchesA = await prisma.inventoryBatch.findMany({
      where: {
        tenantId: data.auth.tenantId,
        productId: data.product.id,
        warehouseId: data.warehouseA.id
      }
    });

    const batchesB = await prisma.inventoryBatch.findMany({
      where: {
        tenantId: data.auth.tenantId,
        productId: data.product.id,
        warehouseId: data.warehouseB.id
      }
    });

    const totalA = batchesA.reduce((sum, batch) => sum + batch.quantityOnHand, 0);
    const totalB = batchesB.reduce((sum, batch) => sum + batch.quantityOnHand, 0);

    expect(totalA).toBe(13);
    expect(totalB).toBe(7);
  });

  test('rejects overselling when stock is insufficient', async () => {
    const data = await bootstrapTenant();

    const transfer = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send({
        fromWarehouseId: data.warehouseA.id,
        toWarehouseId: data.warehouseB.id,
        items: [{ productId: data.product.id, quantity: 999 }]
      })
      .expect(201);

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/approve`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(200);

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/dispatch`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(200);

    await request(app)
      .post(`/api/v1/transfers/${transfer.body.id}/receive`)
      .set('Authorization', `Bearer ${data.auth.token}`)
      .send()
      .expect(409);
  });
});
