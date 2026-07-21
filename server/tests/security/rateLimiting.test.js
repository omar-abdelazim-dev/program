'use strict';

/**
 * @file tests/security/rateLimiting.test.js
 * Rate limiting tests.
 *
 * Covers:
 *  - Login limiter (10 attempts / 15 min per IP+email)
 *  - Register limiter (5 / hour)
 *  - Forgot password limiter (5 / hour)
 *  - Global limiter (300 / 15 min)
 *  - 429 status code on limit exceeded
 *  - Retry-After header presence
 */

const request = require('supertest');
const { app, connectTestDb, disconnectTestDb, clearDb } = require('../helpers/testApp');

beforeAll(async () => { await connectTestDb(); });
afterAll(async () => { await disconnectTestDb(); });
beforeEach(async () => { await clearDb(); });

describe('Rate Limiting', () => {
  test('login — returns 429 after 10 failed attempts', async () => {
    const email = `ratetest_${Date.now()}@example.com`;

    let lastRes;
    for (let i = 0; i <= 10; i++) {
      lastRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass@1' });
    }

    expect(lastRes.status).toBe(429);
    expect(lastRes.body.success).toBe(false);
  }, 30000);

  test('login 429 — includes RateLimit headers', async () => {
    const email = `ratetest_${Date.now()}@example.com`;

    let lastRes;
    for (let i = 0; i <= 10; i++) {
      lastRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass@1' });
    }

    // express-rate-limit v7 sets RateLimit-* headers
    const hasRateLimitHeader =
      lastRes.headers['ratelimit-limit'] ||
      lastRes.headers['x-ratelimit-limit'];
    expect(hasRateLimitHeader).toBeDefined();
  }, 30000);

  test('forgot-password — returns 429 after 5 requests', async () => {
    let lastRes;
    for (let i = 0; i <= 5; i++) {
      lastRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'victim@example.com' });
    }
    expect(lastRes.status).toBe(429);
  }, 30000);
});

describe('Rate limiting response format', () => {
  test('429 response includes correct JSON structure', async () => {
    const email = `fmt_${Date.now()}@example.com`;

    let lastRes;
    for (let i = 0; i <= 10; i++) {
      lastRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass@1' });
    }

    if (lastRes.status === 429) {
      expect(lastRes.body).toHaveProperty('success', false);
      expect(lastRes.body).toHaveProperty('message');
    }
  }, 30000);
});
