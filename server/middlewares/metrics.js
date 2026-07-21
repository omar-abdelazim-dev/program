'use strict';

/**
 * @file middlewares/metrics.js
 * Prometheus metrics integration using prom-client.
 */

const promClient = require('prom-client');

// Initialize default metrics (CPU, RAM, Event Loop)
promClient.collectDefaultMetrics({ prefix: 'program_' });

// Define custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'program_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
});

/**
 * Middleware to track HTTP request metrics.
 */
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationMs = (elapsed[0] * 1e3) + (elapsed[1] / 1e6);
    // Use req.route.path if available, otherwise just base path to prevent cardinality explosion
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(durationMs);
  });
  
  next();
};

/**
 * Expose metrics endpoint.
 */
const metricsEndpoint = async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
};
