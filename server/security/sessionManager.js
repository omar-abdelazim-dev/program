'use strict';

/**
 * @file security/sessionManager.js
 * Enterprise Session Security.
 *
 * Implements:
 *  - Refresh token rotation
 *  - Token reuse detection
 *  - Maximum 2 active sessions per account
 *  - Distributed locks (Redlock) to prevent TOCTOU race conditions
 *
 * OWASP ASVS §3.3, §3.5
 */

const RefreshToken = require('../models/RefreshToken');
const { revokeToken } = require('./tokenBlacklist');
const { securityLogger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const redlock = require('./redlock');

const MAX_SESSIONS = 2;

// ── Session creation ───────────────────────────────────────────────────────

/**
 * Persist a new refresh token and enforce the session limit.
 * Uses Redlock to ensure atomic session counting.
 */
const createSession = async ({ jti, userId, expiresAt, ip, userAgent, familyId }) => {
  const lockKey = `lock:session:${userId.toString()}`;
  let lock;
  
  try {
    lock = await redlock.acquire([lockKey], 5000); // 5 sec lock
    
    // Enforce max sessions inside the lock
    const activeSessions = await RefreshToken.find({
      user: userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 }) // oldest first
      .lean();

    if (activeSessions.length >= MAX_SESSIONS) {
      // Revoke oldest session
      const oldest = activeSessions[0];
      await revokeToken(oldest.jti, Math.floor(new Date(oldest.expiresAt).getTime() / 1000));
      await RefreshToken.updateOne(
        { _id: oldest._id },
        { revoked: true, revokedAt: new Date() }
      );
      securityLogger.securityEvent('SESSION_LIMIT_ENFORCED', {
        userId,
        revokedJti: oldest.jti,
        ip,
      });
    }

    // Create the new session record
    await RefreshToken.create({
      jti,
      user: userId,
      expiresAt,
      ip,
      userAgent,
      familyId: familyId || jti,
      revoked: false,
    });
  } catch (err) {
    if (err.name === 'ExecutionError') {
      securityLogger.error('SESSION_LOCK_TIMEOUT', { userId, err: err.message });
      throw ApiError.internal('Unable to acquire session lock. Try again.');
    }
    throw err;
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
};

// ── Token rotation ─────────────────────────────────────────────────────────

/**
 * Rotate a refresh token safely using distributed locks.
 */
const rotateToken = async ({ oldJti, familyId, userId, ip, userAgent }) => {
  const lockKey = `lock:family:${familyId}`;
  let lock;

  try {
    lock = await redlock.acquire([lockKey], 5000);

    const record = await RefreshToken.findOne({ jti: oldJti }).lean();

    if (!record) {
      securityLogger.securityEvent('TOKEN_REUSE_UNKNOWN_JTI', { oldJti, userId, ip });
      return { rotationDetected: true, revokedFamily: false };
    }

    if (record.revoked) {
      // REUSE DETECTED — revoke entire token family
      securityLogger.securityEvent('TOKEN_REUSE_DETECTED', {
        userId,
        oldJti,
        familyId: record.familyId || familyId,
        ip,
        userAgent,
      });

      const familyTokens = await RefreshToken.find({
        familyId: record.familyId || familyId,
        revoked: false,
      }).lean();

      for (const t of familyTokens) {
        await revokeToken(t.jti, Math.floor(new Date(t.expiresAt).getTime() / 1000));
      }

      await RefreshToken.updateMany(
        { familyId: record.familyId || familyId },
        { revoked: true, revokedAt: new Date() }
      );

      return { rotationDetected: true, revokedFamily: true };
    }

    // Normal rotation — revoke old token
    await revokeToken(oldJti, Math.floor(new Date(record.expiresAt).getTime() / 1000));
    await RefreshToken.updateOne({ _id: record._id }, { revoked: true, revokedAt: new Date(), consumed: true });

    return { rotationDetected: false, revokedFamily: false };

  } catch (err) {
    if (err.name === 'ExecutionError') {
      throw ApiError.internal('System busy. Try again.');
    }
    throw err;
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
};

// ── Revoke all user sessions ───────────────────────────────────────────────

/**
 * Revoke ALL active sessions for a user.
 */
const revokeAllSessions = async (userId, reason = 'MANUAL_REVOKE') => {
  const activeSessions = await RefreshToken.find({
    user: userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  for (const session of activeSessions) {
    await revokeToken(
      session.jti,
      Math.floor(new Date(session.expiresAt).getTime() / 1000)
    );
  }

  await RefreshToken.updateMany(
    { user: userId, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );

  securityLogger.securityEvent('ALL_SESSIONS_REVOKED', { userId, reason });
};

// ── Get active sessions ────────────────────────────────────────────────────

/**
 * Return active session metadata for a user.
 */
const getActiveSessions = async (userId) => {
  return RefreshToken.find({
    user: userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  })
    .select('jti ip userAgent createdAt expiresAt')
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = {
  createSession,
  rotateToken,
  revokeAllSessions,
  getActiveSessions,
  MAX_SESSIONS,
};
