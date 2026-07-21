'use strict';

/**
 * @file config/redis.js
 * Redis client configuration for distributed security state.
 * Uses ioredis for clustering and sentinel support if needed in enterprise.
 */

const Redis = require('ioredis');
const { logger } = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared instance for general caching and rate limiting
const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    // Reconnect after
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

// A second dedicated instance for Pub/Sub or Redlock if necessary
// but Redlock can reuse the main client for simpler setups.

module.exports = redisClient;
