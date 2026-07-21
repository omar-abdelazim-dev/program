'use strict';

/**
 * @file middlewares/idempotency.js
 * Idempotency Key middleware for safe retries of state-changing API requests (POST/PATCH).
 * Prevents double-charging or duplicate resource creation.
 */

const redisClient = require('../config/redis');
const ApiError = require('../utils/ApiError');

const IDEMPOTENCY_PREFIX = 'idempotent:';
const TTL_SECONDS = 86400; // 24 hours

const requireIdempotency = async (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next(ApiError.badRequest('Idempotency-Key header is required for this operation.'));
  }

  // Bind to user ID to prevent cross-user key collisions
  const userId = req.user ? req.user.id : 'anonymous';
  const redisKey = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}`;

  try {
    const isNew = await redisClient.set(redisKey, 'PROCESSING', 'NX', 'EX', TTL_SECONDS);

    if (!isNew) {
      const status = await redisClient.get(redisKey);
      if (status === 'PROCESSING') {
        return next(ApiError.conflict('Request is already processing. Please wait.'));
      }
      // If it's a completed response, we should ideally return the cached response.
      // For this simplified version, we just reject duplicates.
      return next(ApiError.conflict('Request with this Idempotency-Key has already been processed.'));
    }

    // Wrap res.json to cache the success response if we wanted to (omitted for brevity, marking as DONE)
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisClient.set(redisKey, 'DONE', 'EX', TTL_SECONDS).catch(() => {});
      } else {
        // Remove key on error so client can retry safely
        redisClient.del(redisKey).catch(() => {});
      }
      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    next(ApiError.internal('Idempotency check failed'));
  }
};

module.exports = { requireIdempotency };
