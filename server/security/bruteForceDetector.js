'use strict';

/**
 * @file security/bruteForceDetector.js
 * Enterprise Security Monitoring using Redis.
 *
 * Detects and tracks:
 *  - Multiple failed login attempts per IP
 *  - Multiple failed login attempts per user account
 *  - Token replay attacks
 *  - Suspicious IP activity
 *
 * Uses Redis atomic INCR and PEXPIRE for sliding/fixed windows
 * to support horizontally scaled deployments.
 */

const redisClient = require('../config/redis');
const { securityLogger } = require('../utils/logger');

// ── Window configuration ────────────────────────────────────────────────────

const WINDOWS = {
  failedLogin:    { limit: 10, windowMs: 15 * 60 * 1000 },  // 10 failures / 15 min per IP
  failedAccount:  { limit: 5,  windowMs: 15 * 60 * 1000 },  // 5 failures / 15 min per account
  tokenReplay:    { limit: 3,  windowMs: 60 * 60 * 1000 },  // 3 replays / 1 hr per IP
  suspiciousIp:   { limit: 50, windowMs: 5 * 60 * 1000 },   // 50 requests / 5 min per IP
};

// ── Redis atomic increment helper ──────────────────────────────────────────

/**
 * Atomically increment a Redis key and set expiry if it's new.
 * @param {string} key
 * @param {number} windowMs
 * @param {number} limit
 * @returns {Promise<{ count: number, isExceeded: boolean, limit: number }>}
 */
const incrementRedis = async (key, windowMs, limit) => {
  try {
    const multi = redisClient.multi();
    multi.incr(key);
    // Note: To perfectly reset TTL on first increment without race conditions,
    // we use a simple pattern: if count becomes 1, we set expiration.
    // ioredis pipeline executes this together.
    const results = await multi.exec();
    const count = results[0][1];
    
    if (count === 1) {
      await redisClient.pexpire(key, windowMs).catch(() => {});
    }

    return { count, isExceeded: count > limit, limit };
  } catch (err) {
    securityLogger.error('REDIS_BRUTE_FORCE_ERROR', { error: err.message, key });
    // Fail open if Redis is down
    return { count: 0, isExceeded: false, limit };
  }
};

/**
 * Reset a counter.
 * @param {string} key
 */
const resetRedis = async (key) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    securityLogger.error('REDIS_RESET_ERROR', { error: err.message, key });
  }
};

// ── Public detection methods ───────────────────────────────────────────────

/**
 * Record a failed login attempt and check thresholds.
 * @param {string} ip
 * @param {string} identifier  - email or username
 * @returns {Promise<{ ipBlocked: boolean, accountBlocked: boolean }>}
 */
const recordFailedLogin = async (ip, identifier) => {
  const [ipResult, accResult] = await Promise.all([
    incrementRedis(`bf:login_fail_ip:${ip}`, WINDOWS.failedLogin.windowMs, WINDOWS.failedLogin.limit),
    incrementRedis(`bf:login_fail_acc:${identifier}`, WINDOWS.failedAccount.windowMs, WINDOWS.failedAccount.limit)
  ]);

  if (ipResult.isExceeded) {
    securityLogger.securityEvent('BRUTE_FORCE_IP_DETECTED', { ip, identifier });
  }

  if (accResult.isExceeded) {
    securityLogger.securityEvent('BRUTE_FORCE_ACCOUNT_DETECTED', { ip, identifier, count: accResult.count });
  }

  return { ipBlocked: ipResult.isExceeded, accountBlocked: accResult.isExceeded };
};

/**
 * Clear failure counters on successful login.
 * @param {string} ip
 * @param {string} identifier
 */
const clearFailedLogin = async (ip, identifier) => {
  await Promise.all([
    resetRedis(`bf:login_fail_ip:${ip}`),
    resetRedis(`bf:login_fail_acc:${identifier}`)
  ]);
};

/**
 * Record a token replay attempt.
 * @param {string} ip
 * @param {string} jti
 * @returns {Promise<{ blocked: boolean }>}
 */
const recordTokenReplay = async (ip, jti) => {
  const { isExceeded } = await incrementRedis(
    `bf:token_replay:${ip}`,
    WINDOWS.tokenReplay.windowMs,
    WINDOWS.tokenReplay.limit
  );

  securityLogger.securityEvent('TOKEN_REPLAY_ATTEMPT', { ip, jti, blocked: isExceeded });
  return { blocked: isExceeded };
};

/**
 * Record a suspicious request (e.g. invalid content-type, malformed JSON).
 * @param {string} ip
 * @param {string} reason
 * @returns {Promise<{ flagged: boolean }>}
 */
const recordSuspiciousRequest = async (ip, reason) => {
  const { count, isExceeded } = await incrementRedis(
    `bf:suspicious:${ip}`,
    WINDOWS.suspiciousIp.windowMs,
    WINDOWS.suspiciousIp.limit
  );

  if (isExceeded || count % 10 === 0) {
    securityLogger.securityEvent('SUSPICIOUS_IP_ACTIVITY', { ip, reason, count });
  }

  return { flagged: isExceeded };
};

/**
 * Check if an IP is currently flagged for brute force.
 * @param {string} ip
 * @returns {Promise<boolean>}
 */
const isIpFlagged = async (ip) => {
  try {
    const count = await redisClient.get(`bf:login_fail_ip:${ip}`);
    return count !== null && parseInt(count, 10) >= WINDOWS.failedLogin.limit;
  } catch {
    return false;
  }
};

module.exports = {
  recordFailedLogin,
  clearFailedLogin,
  recordTokenReplay,
  recordSuspiciousRequest,
  isIpFlagged,
  WINDOWS,
};
