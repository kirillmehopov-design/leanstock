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

describe('RBAC middleware', () => {
  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  test('returns 403 when AUDITOR tries manager-only action', async () => {
    const ownerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'rbac_owner@example.kz',
        username: 'rbac_owner',
        password: 'StrongPass123',
        tenantName: 'RBAC Market'
      })
      .expect(201);

    await verifyUserEmail('rbac_owner@example.kz');

    const auditorResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'rbac_auditor@example.kz',
        username: 'rbac_auditor',
        password: 'StrongPass123'
      })
      .expect(201);

    await verifyUserEmail('rbac_auditor@example.kz');

    await request(app)
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${ownerResponse.body.accessToken}`)
      .send({
        email: 'rbac_auditor@example.kz',
        role: 'AUDITOR'
      })
      .expect(201);

    await request(app)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${auditorResponse.body.accessToken}`)
      .send({ name: 'Forbidden Warehouse' })
      .expect(403);
  });

  test('owner cannot assign a user who already belongs to another tenant', async () => {
    const ownerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'tenant_owner@example.kz',
        username: 'tenant_owner',
        password: 'StrongPass123',
        tenantName: 'Main Tenant'
      })
      .expect(201);
    await verifyUserEmail('tenant_owner@example.kz');

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'other_owner@example.kz',
        username: 'other_owner',
        password: 'StrongPass123',
        tenantName: 'Other Tenant'
      })
      .expect(201);
    await verifyUserEmail('other_owner@example.kz');

    await request(app)
      .post('/api/v1/memberships')
      .set('Authorization', `Bearer ${ownerResponse.body.accessToken}`)
      .send({ email: 'other_owner@example.kz', role: 'STAFF' })
      .expect(409);
  });

});
