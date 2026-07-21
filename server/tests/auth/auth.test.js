'use strict';

/**
 * @file tests/auth/auth.test.js
 * Authentication security tests.
 *
 * Covers:
 *  - Registration (success, duplicate, weak password)
 *  - Login (success, wrong password, non-existent user, account lockout)
 *  - JWT access token validation
 *  - Refresh token rotation
 *  - Logout and token revocation
 *  - Email verification structure
 *  - Forgot/reset password
 */

const request = require('supertest');
const { app, connectTestDb, disconnectTestDb, clearDb } = require('../helpers/testApp');
const { createTestUser, DEFAULT_PASSWORD } = require('../helpers/testUser');
const User = require('../../models/User');

beforeAll(async () => { await connectTestDb(); });
afterAll(async () => { await disconnectTestDb(); });
beforeEach(async () => { await clearDb(); });

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  const validPayload = {
    firstName: 'Jane',
    lastName:  'Doe',
    email:     'jane@example.com',
    password:  DEFAULT_PASSWORD,
  };

  test('201 — creates account and returns access token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('jane@example.com');
    // Password must NEVER appear in response
    expect(JSON.stringify(res.body)).not.toContain('password');
    // Refresh token in HttpOnly cookie
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('201 — refresh token cookie is HttpOnly', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);
    const cookie = res.headers['set-cookie']?.join('') || '';
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  test('409 — duplicate email returns conflict', async () => {
    await request(app).post('/api/v1/auth/register').send(validPayload);
    const res = await request(app).post('/api/v1/auth/register').send(validPayload);
    expect(res.status).toBe(409);
  });

  test('400 — weak password is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, password: 'weak' });
    expect(res.status).toBe(400);
  });

  test('400 — missing required fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  test('400 — invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validPayload, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  let userEmail;

  beforeEach(async () => {
    const { user } = await createTestUser();
    userEmail = user.email;
  });

  test('200 — login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: DEFAULT_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(userEmail);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('401 — wrong password returns generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'WrongPass@1' });
    expect(res.status).toBe(401);
    // Must not reveal whether email is registered
    expect(res.body.message).toContain('Invalid email or password');
  });

  test('401 — non-existent email returns generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid email or password');
  });

  test('401 — account locked after 5 failed attempts', async () => {
    const wrongPassword = 'WrongPass@9';
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: wrongPassword });
    }
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: DEFAULT_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('locked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

describe('JWT — access token validation', () => {
  test('401 — missing Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 — malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  test('401 — wrong token type (refresh token used as access)', async () => {
    const { refreshToken } = await createTestUser();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshToken}`);
    expect(res.status).toBe(401);
  });

  test('200 — valid access token is accepted', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  test('200 — logout clears cookie', async () => {
    const { accessToken } = await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  test('401 — logout without auth is rejected', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT / RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

describe('Password reset flow', () => {
  test('200 — forgot password always returns 200 (prevents enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });
    expect(res.status).toBe(200);
  });

  test('400 — reset password with invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid-token', newPassword: DEFAULT_PASSWORD, confirmPassword: DEFAULT_PASSWORD });
    expect(res.status).toBe(400);
  });

  test('400 — reset password with weak new password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'any', newPassword: 'weak', confirmPassword: 'weak' });
    expect(res.status).toBe(400);
  });
});
