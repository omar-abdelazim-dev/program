/**
 * Centralized error handler middleware.
 *
 * This replaces the inline error handler in app.js. It:
 *   1. Maps known error types to appropriate HTTP status codes.
 *   2. NEVER exposes stack traces, database internals, or implementation
 *      details to the client in production.
 *   3. Logs the full error (including stack) to Winston for server-side debugging.
 *   4. Preserves the existing { message } response format used throughout the app.
 *
 * Must be registered as the LAST middleware in app.js, after all routes.
 *
 * OWASP: A05:2021 – Security Misconfiguration
 */

import logger from '../utils/logger.js';

const isProd = process.env.NODE_ENV === 'production';

export const errorHandler = (err, req, res, next) => {
  // Log the full error server-side — this is for ops, not the client
  logger.error(`${err.name || 'Error'}: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
  });

  // ── Mongoose Validation Error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join('. ') });
  }

  // ── Mongoose Cast Error (invalid ObjectId) ───────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // ── MongoDB Duplicate Key ─────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `A record with this ${field} already exists` });
  }

  // ── JWT Errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }

  // ── Multer Errors ─────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    const multerMessages = {
      LIMIT_FILE_SIZE: 'File is too large',
      LIMIT_FILE_COUNT: 'Too many files',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };
    return res.status(400).json({
      message: multerMessages[err.code] || `Upload error: ${err.message}`,
    });
  }

  // ── express-validator (passed via next(err)) ──────────────────────────────
  if (err.isValidationError) {
    return res.status(400).json({ message: err.message });
  }

  // ── Default: 500 Internal Server Error ───────────────────────────────────
  // Never reveal the actual error message in production — it may contain
  // file paths, DB connection strings, or other sensitive implementation details.
  const clientMessage = isProd
    ? 'Something went wrong on the server'
    : err.message || 'Something went wrong on the server';

  return res.status(err.status || err.statusCode || 500).json({
    message: clientMessage,
  });
};
