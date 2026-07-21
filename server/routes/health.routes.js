'use strict';

/**
 * @file routes/health.routes.js
 * Readiness and Liveness probes for Kubernetes/Enterprise orchestrators.
 */

const { Router } = require('express');
const mongoose = require('mongoose');
const redisClient = require('../config/redis');
const { metricsEndpoint } = require('../middlewares/metrics');

const router = Router();

// Liveness probe (is the process running?)
router.get('/liveness', (_req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Readiness probe (can it accept traffic?)
router.get('/readiness', async (_req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isRedisConnected = redisClient.status === 'ready';

  if (isMongoConnected && isRedisConnected) {
    res.status(200).json({
      status: 'READY',
      mongo: 'connected',
      redis: 'connected'
    });
  } else {
    res.status(503).json({
      status: 'UNAVAILABLE',
      mongo: isMongoConnected ? 'connected' : 'disconnected',
      redis: isRedisConnected ? 'ready' : redisClient.status
    });
  }
});

// Prometheus metrics endpoint
router.get('/metrics', metricsEndpoint);

module.exports = router;
