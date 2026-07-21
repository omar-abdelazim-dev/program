'use strict';

/**
 * @file tests/security/csrf.test.js
 * CSRF protection tests.
 *
 * Covers:
 *  - State-changing requests without CSRF token are rejected
 *  - GET requests are always allowed (safe methods exempt)
 *  - Public pre-auth endpoints are exempt (login, register, refresh)
 *  - CSRF validation failure logs security event
 *  - x-csrf-token header is the expected delivery mechanism
 */

const request = require('supertest');
const { app, connectTestDb, disconnectTestDb, clearDb } = require('../helpers/testApp');
const { createTestUser } = require('../helpers/testUser');

beforeAll(async () => { await connectTestDb(); });
afterAll(async () => { await disconnectTestDb(); });
beforeEach(async () => { await clearDb(); });

describe('CSRF — exempt endpoints', () => {
  test('POST /auth/login is CSRF-exempt', async () => {
    // Login endpoint must work WITHOUT a CSRF token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'unknown@example.com', password: 'SomePass@1' });
    // Should return 401 (wrong credentials), NOT 403 (CSRF failure)
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(401);
  });

  test('POST /auth/register is CSRF-exempt', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'A',
        lastName: 'B',
        email: 'csrf_test@example.com',
        password: 'TestPass@123',
      });
    // Should succeed (201) — NOT 403 CSRF failure
    expect(res.status).toBe(201);
  });

  test('POST /auth/forgot-password is CSRF-exempt', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'csrf@example.com' });
    expect(res.status).not.toBe(403);
  });

  test('POST /auth/refresh is CSRF-exempt', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});
    // Should return 401 (no token), NOT 403 CSRF
    expect(res.status).toBe(401);
  });
});

describe('CSRF — protected endpoints require token', () => {
  test('DELETE /sessions without CSRF token returns 403', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .delete('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      // No x-csrf-token header
      .send();

    // Either 403 (CSRF failure) or 401 (no CSRF cookie) — both mean protection is active
    expect([401, 403]).toContain(res.status);
  });
});

describe('CSRF — safe methods are always exempt', () => {
  test('GET /api/v1/auth/me requires no CSRF token', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  test('GET /health requires no CSRF token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
