'use strict';

/**
 * @file middlewares/errorHandler.js
 * Centralised error handling middleware.
 *
 * Rules:
 *  - Operational errors (ApiError): return the safe message.
 *  - Programming errors: return generic "Internal server error" in production.
 *  - Stack traces are NEVER sent to the client in production.
 *  - All errors are logged via Winston.
 *
 * OWASP ASVS §7.4 — Error Handling
 * OWASP Top 10: A09 — Security Logging and Monitoring Failures
 */

const ApiError = require('../utils/ApiError');
const { logger } = require('../utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Mongoose error mapper ─────────────────────────────────────────────────

const mapMongooseError = (err) => {
  // Duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`${field} already exists`);
  }
  // Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.badRequest('Validation failed', errors);
  }
  // Cast error (invalid ObjectId in a Mongoose query)
  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for field: ${err.path}`);
  }
  return null;
};

// ── JWT error mapper ──────────────────────────────────────────────────────

const mapJwtError = (err) => {
  if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid token');
  if (err.name === 'TokenExpiredError')  return ApiError.unauthorized('Token has expired');
  if (err.name === 'NotBeforeError')     return ApiError.unauthorized('Token not yet active');
  return null;
};

// ── CORS error ────────────────────────────────────────────────────────────
const mapCorsError = (err) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return ApiError.forbidden(err.message);
  }
  return null;
};

// ── Global error handler ──────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // ── Map third-party errors to ApiError ───────────────────────────────
  let error = err;

  if (!(err instanceof ApiError)) {
    error =
      mapMongooseError(err) ||
      mapJwtError(err)      ||
      mapCorsError(err)     ||
      new ApiError(
        err.statusCode || 500,
        err.isOperational ? err.message : 'Internal server error',
        [],
        err.stack
      );
  }

  // ── Log the error ─────────────────────────────────────────────────────
  const logPayload = {
    statusCode: error.statusCode,
    method:     req.method,
    path:       req.path,
    ip:         req.ip,
    userId:     req.user?.id || 'unauthenticated',
    message:    error.message,
  };

  if (error.statusCode >= 500) {
    logger.error('SERVER_ERROR', { ...logPayload, stack: err.stack });
  } else {
    logger.warn('CLIENT_ERROR', logPayload);
  }

  // ── Build response ────────────────────────────────────────────────────
  const responseBody = {
    success: false,
    message: error.message,
    ...(error.errors?.length ? { errors: error.errors } : {}),
    // Stack trace only in development
    ...(NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(responseBody);
};

module.exports = errorHandler;
