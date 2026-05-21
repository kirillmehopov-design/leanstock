import request from 'supertest';
import { app } from '../../src/app.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/config/prisma.js';
import { env } from '../../src/config/env.js';
import { setupIntegration, teardownIntegration } from './setup.js';

async function verifyUserEmail(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  expect(user?.emailVerifyToken).toBeDefined();

  await request(app)
    .get('/api/v1/auth/verify-email')
    .query({ token: user.emailVerifyToken })
    .expect(200);
}

describe('auth endpoints', () => {
  beforeAll(setupIntegration);
  afterAll(teardownIntegration);

  test('registers, verifies email, logs in, refreshes and logs out', async () => {
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'owner@example.kz',
        username: 'owner_user',
        password: 'StrongPass123',
        tenantName: 'Demo Market'
      })
      .expect(201);

    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();
    expect(registerResponse.body.tenantId).toBeDefined();
    expect(registerResponse.body.user.emailVerified).toBe(false);

    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@example.kz',
        password: 'StrongPass123'
      })
      .expect(403);

    await verifyUserEmail('owner@example.kz');

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@example.kz',
        password: 'StrongPass123'
      })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(200);
  });

  test('protected endpoint rejects missing token', async () => {
    await request(app)
      .get('/api/v1/users/me')
      .expect(401);
  });


  test('protected endpoint rejects invalid and expired tokens', async () => {
    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer clearly-invalid-token')
      .expect(401);

    const user = await prisma.user.create({
      data: {
        email: 'expired_token@example.kz',
        username: 'expired_token_user',
        passwordHash: 'not-used-in-this-test',
        emailVerified: true
      }
    });

    const expiredToken = jwt.sign(
      { sub: user.id, email: user.email, tokenVersion: user.tokenVersion },
      env.JWT_ACCESS_SECRET,
      { expiresIn: -1 }
    );

    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

});
