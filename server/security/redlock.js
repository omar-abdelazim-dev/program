'use strict';

/**
 * @file security/redlock.js
 * Distributed locking mechanism using Redis.
 * Prevents TOCTOU race conditions across clustered Node.js instances.
 */

const Redlock = require('redlock').default || require('redlock');
const redisClient = require('../config/redis');

// Configure Redlock with our single redis client
// In a highly available enterprise setup, this array would contain multiple independent Redis nodes.
const redlock = new Redlock(
  [redisClient],
  {
    driftFactor: 0.01, // time in ms
    retryCount:  10,
    retryDelay:  200, // time in ms
    retryJitter:  200, // time in ms
    automaticExtensionThreshold: 500, // time in ms
  }
);

redlock.on('error', (error) => {
  // Ignore cases where a lock is already held or timed out
  if (error && error.message && error.message.includes('attempts to lock the resource')) {
    return;
  }
  const { securityLogger } = require('../utils/logger');
  securityLogger.error('REDLOCK_ERROR', { error: error.message });
});

module.exports = redlock;
