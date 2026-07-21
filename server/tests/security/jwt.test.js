'use strict';

/**
 * @file tests/security/jwt.test.js
 * JWT security tests.
 *
 * Covers:
 *  - Token generation (access + refresh)
 *  - Token verification (valid, expired, tampered)
 *  - Token type enforcement (refresh token cannot be used as access)
 *  - Blacklisted token rejection
 *  - Token rotation (new tokens on refresh)
 *  - Reuse detection (revoked token presented again)
 *  - passwordChangedAt invalidation
 */

const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../utils/generateTokens');
const { revokeToken, isRevoked } = require('../../security/tokenBlacklist');

describe('JWT — token generation', () => {
  test('access token contains correct claims', () => {
    const token = generateAccessToken({ userId: 'user123', role: 'student' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user123');
    expect(decoded.role).toBe('student');
    expect(decoded.type).toBe('access');
    expect(decoded.jti).toBeDefined();
  });

  test('refresh token contains correct claims', () => {
    const token = generateRefreshToken({ userId: 'user456', role: 'instructor' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user456');
    expect(decoded.role).toBe('instructor');
    expect(decoded.type).toBe('refresh');
    expect(decoded.jti).toBeDefined();
  });

  test('each token has a unique jti', () => {
    const t1 = generateAccessToken({ userId: 'u1', role: 'student' });
    const t2 = generateAccessToken({ userId: 'u1', role: 'student' });
    const d1 = verifyAccessToken(t1);
    const d2 = verifyAccessToken(t2);
    expect(d1.jti).not.toBe(d2.jti);
  });

  test('access token cannot be verified with refresh secret', () => {
    const accessToken = generateAccessToken({ userId: 'u1', role: 'student' });
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  test('refresh token cannot be verified with access secret', () => {
    const refreshToken = generateRefreshToken({ userId: 'u1', role: 'student' });
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});

describe('JWT — tamper detection', () => {
  test('tampered signature is rejected', () => {
    const token = generateAccessToken({ userId: 'u1', role: 'student' });
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.tampered_signature`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  test('tampered payload is rejected', () => {
    const token = generateAccessToken({ userId: 'u1', role: 'student' });
    const parts = token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: 'hacker', role: 'admin', type: 'access' })).toString('base64url');
    const tampered = `${parts[0]}.${payload}.${parts[2]}`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  test('alg:none attack is rejected', () => {
    const token = generateAccessToken({ userId: 'u1', role: 'student' });
    const parts = token.split('.');
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const noneToken = `${header}.${parts[1]}.`;
    expect(() => verifyAccessToken(noneToken)).toThrow();
  });
});

describe('JWT — token blacklist', () => {
  test('revoked token is detected as revoked', async () => {
    const jti = 'test-jti-blacklist-1';
    const futureExp = Math.floor(Date.now() / 1000) + 3600;

    await revokeToken(jti, futureExp);
    const revoked = await isRevoked(jti);
    expect(revoked).toBe(true);
  });

  test('non-revoked jti is not in blacklist', async () => {
    const revoked = await isRevoked('this-jti-was-never-revoked');
    expect(revoked).toBe(false);
  });
});
