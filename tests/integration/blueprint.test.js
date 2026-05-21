import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { setupIntegration, teardownIntegration } from './setup.js';

async function verifyUserEmail(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  await request(app).get('/api/v1/auth/verify-email').query({ token: user.emailVerifyToken }).expect(200);
}

async function createTenantOwner(suffix = Math.random().toString(36).slice(2, 8)) {
  const email = `blueprint_${suffix}@leanstock.kz`;
  const register = await request(app).post('/api/v1/auth/register').send({
    email,
    username: `blueprint_owner_${suffix}`,
    password: 'StrongPass123',
    tenantName: `Blueprint Market ${suffix}`
  }).expect(201);
  await verifyUserEmail(email);
  return { email, token: register.body.accessToken, tenantId: register.body.tenantId };
}

async function prepareInventory(owner) {
  const warehouse = await request(app).post('/api/v1/warehouses')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: 'Reservation Store' }).expect(201);

  const product = await request(app).post('/api/v1/products')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ sku: 'TEA-001', name: 'Tea Box', basePrice: 1200, minSalePrice: 900, reorderPoint: 2 })
    .expect(201);

  await request(app).post('/api/v1/inventory/batches')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ productId: product.body.id, warehouseId: warehouse.body.id, quantityOnHand: 10, unitCost: 700, salePrice: 1200, minSalePrice: 900 })
    .expect(201);

  return { warehouse: warehouse.body, product: product.body };
}

describe('blueprint-aligned workflows', () => {
  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  test('owner manages suppliers/categories and creates product with catalog links', async () => {
    const owner = await createTenantOwner('catalog');

    const supplier = await request(app).post('/api/v1/catalog/suppliers')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Almaty Dairy Supplier', phone: '+77001112233' }).expect(201);

    const category = await request(app).post('/api/v1/catalog/categories')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Dairy' }).expect(201);

    const product = await request(app).post('/api/v1/products')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        sku: 'MILK-CAT-1', name: 'Milk catalog item', basePrice: 520, minSalePrice: 350, reorderPoint: 10,
        supplierId: supplier.body.id, categoryId: category.body.id
      }).expect(201);

    expect(product.body.supplierId).toBe(supplier.body.id);
    expect(product.body.categoryId).toBe(category.body.id);
  });

  test('staff-style reservation flow reserves stock and confirms a sale', async () => {
    const owner = await createTenantOwner('reservation');
    const { warehouse, product } = await prepareInventory(owner);

    const reservation = await request(app).post('/api/v1/reservations')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ warehouseId: warehouse.id, customerName: 'Demo Customer', customerEmail: 'customer@example.kz', items: [{ productId: product.id, quantity: 3 }] })
      .expect(201);

    const batchAfterReserve = await prisma.inventoryBatch.findFirst({ where: { tenantId: owner.tenantId, productId: product.id, warehouseId: warehouse.id } });
    expect(batchAfterReserve.reservedQuantity).toBe(3);

    const confirmed = await request(app).post(`/api/v1/reservations/${reservation.body.id}/confirm`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send().expect(201);

    expect(confirmed.body.sale.items[0].quantity).toBe(3);

    const batchAfterConfirm = await prisma.inventoryBatch.findFirst({ where: { tenantId: owner.tenantId, productId: product.id, warehouseId: warehouse.id } });
    expect(batchAfterConfirm.quantityOnHand).toBe(7);
    expect(batchAfterConfirm.reservedQuantity).toBe(0);
  });

  test('platform super admin can suspend and reactivate tenants', async () => {
    const owner = await createTenantOwner('platform');

    const adminRegister = await request(app).post('/api/v1/auth/register-super-admin').send({
      email: 'superadmin@leanstock.kz', username: 'superadmin_01', password: 'StrongPass123', setupKey: 'local-super-admin-setup-key'
    }).expect(201);
    await verifyUserEmail('superadmin@leanstock.kz');

    await request(app).get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${adminRegister.body.accessToken}`)
      .expect(200);

    await request(app).patch(`/api/v1/platform/tenants/${owner.tenantId}/suspend`)
      .set('Authorization', `Bearer ${adminRegister.body.accessToken}`)
      .send({ reason: 'Pre-defense demo' }).expect(200);

    await request(app).get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(403);

    await request(app).patch(`/api/v1/platform/tenants/${owner.tenantId}/reactivate`)
      .set('Authorization', `Bearer ${adminRegister.body.accessToken}`)
      .send().expect(200);
  });
});
