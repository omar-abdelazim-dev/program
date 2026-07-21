'use strict';

/**
 * @file server.js
 * Application entry point — Sprint 1.
 *
 * Boot sequence (order is immutable):
 *  1. config/index.js  → load .env + validate ALL variables → exit on failure
 *  2. config/database  → connect MongoDB → exit on failure
 *  3. app.js           → create fully-secured Express app
 *  4. app.listen()     → start HTTP server
 *
 * Unhandled rejections and uncaught exceptions are caught here to
 * ensure the process always logs before exiting.
 */

// ── Step 1: Environment validation (MUST be first require) ────────────────
const config = require('./config');

// ── Step 2: MongoDB connection ────────────────────────────────────────────
const connectDB = require('./config/database');

// ── Logger (safe to init after config is loaded) ──────────────────────────
const { logger } = require('./utils/logger');

// ── Step 3: Express app ────────────────────────────────────────────────────
const app = require('./app');

// ── Unhandled error safety nets ────────────────────────────────────────────
// Catch programmer errors that escape the asyncHandler wrapper.
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT_EXCEPTION', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED_REJECTION', { reason: String(reason) });
  process.exit(1);
});

// ── Boot ───────────────────────────────────────────────────────────────────
(async () => {
  // Establish MongoDB connection (exits on failure)
  await connectDB();

  // Start HTTP server
  const server = app.listen(config.app.port, () => {
    logger.info(`🚀  Server running on port ${config.app.port} [${config.app.env}]`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      } catch (err) {
        logger.error('Error closing MongoDB', { error: err.message });
      }
      process.exit(0);
    });

    // Force exit after 30 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
})();
