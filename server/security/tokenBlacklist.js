'use strict';

/**
 * @file security/tokenBlacklist.js
 * Redis + DB-backed refresh token revocation list.
 *
 * On logout, the refresh token's jti is stored in Redis with an expiry
 * matching the token's remaining TTL. It is also persisted to MongoDB
 * for durability across Redis restarts.
 *
 * Enterprise Grade: Horizontal scalability via Redis.
 */

const redisClient = require('../config/redis');

// Prefix for Redis keys
const PREFIX = 'revoked:';

/**
 * Revoke a refresh token by its jti claim.
 * @param {string} jti        - JWT id claim
 * @param {number} expSeconds - Token expiry (unix timestamp in seconds)
 */
const revokeToken = async (jti, expSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const ttl = expSeconds - now;
  
  if (ttl > 0) {
    // Store in Redis with expiration
    await redisClient.set(`${PREFIX}${jti}`, 'true', 'EX', ttl).catch(() => {});
  }

  // Persist to DB so revocations survive restarts
  try {
    const RefreshToken = require('../models/RefreshToken');
    await RefreshToken.updateOne({ jti }, { revoked: true, revokedAt: new Date() }, { upsert: true });
  } catch {
    // DB write failure is non-fatal — Redis still protects current process
  }
};

/**
 * Check if a jti is revoked.
 * Fast path: Redis. Slow path: DB lookup.
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
const isRevoked = async (jti) => {
  try {
    // Fast path — Redis
    const isRevokedInRedis = await redisClient.get(`${PREFIX}${jti}`);
    if (isRevokedInRedis) return true;
  } catch (err) {
    // If Redis is down, fail over to DB
  }

  // Slow path — check DB (then warm the cache)
  try {
    const RefreshToken = require('../models/RefreshToken');
    const record = await RefreshToken.findOne({ jti, revoked: true }).lean();
    if (record) {
      // Warm Redis cache
      const ttl = Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000));
      await redisClient.set(`${PREFIX}${jti}`, 'true', 'EX', ttl).catch(() => {});
      return true;
    }
  } catch {
    // If DB is unreachable, fail-safe: treat as not revoked (availability over security)
  }

  return false;
};

module.exports = { revokeToken, isRevoked };
