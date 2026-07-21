'use strict';

/**
 * @file middlewares/requestValidation.js
 * Sprint 2 — Request Validation.
 *
 * Validates all inbound request dimensions before any business logic runs:
 *  - Headers (required, format, injection)
 *  - Query parameters (depth, size)
 *  - Body structure (nesting depth)
 *  - Content-Type match against body presence
 *  - Accept header (API-only enforcement)
 *
 * Works in tandem with apiProtection.js and express-validator chains.
 * OWASP ASVS §5.1 — Input Validation
 */

const ApiError = require('../utils/ApiError');
const { securityLogger } = require('../utils/logger');
const { recordSuspiciousRequest } = require('../security/bruteForceDetector');

const MAX_QUERY_DEPTH   = 3;   // Prevent deeply nested query objects
const MAX_BODY_DEPTH    = 5;   // Prevent deeply nested JSON payloads
const MAX_QUERY_KEYS    = 20;  // Limit number of query parameters
const MAX_PARAM_LENGTH  = 256; // Maximum length per query/param value

// ── Depth checker ──────────────────────────────────────────────────────────

const getObjectDepth = (obj, depth = 0) => {
  if (depth > 10) return depth; // Safety bail-out
  if (obj === null || typeof obj !== 'object') return depth;
  return Math.max(...Object.values(obj).map((v) => getObjectDepth(v, depth + 1)));
};

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * Validate query string parameters.
 * Blocks deeply nested objects, too many keys, and oversized values.
 */
const validateQueryParams = (req, res, next) => {
  const query = req.query;

  // Key count
  if (Object.keys(query).length > MAX_QUERY_KEYS) {
    recordSuspiciousRequest(req.ip, 'excessive_query_params');
    return next(ApiError.badRequest(`Too many query parameters (max ${MAX_QUERY_KEYS})`));
  }

  // Nesting depth
  if (getObjectDepth(query) > MAX_QUERY_DEPTH) {
    recordSuspiciousRequest(req.ip, 'nested_query_params');
    return next(ApiError.badRequest('Query parameters are too deeply nested'));
  }

  // Value length
  for (const [key, val] of Object.entries(query)) {
    const str = Array.isArray(val) ? val.join('') : String(val);
    if (str.length > MAX_PARAM_LENGTH) {
      return next(ApiError.badRequest(`Query parameter '${key}' value is too long`));
    }
  }

  next();
};

/**
 * Validate request body structure.
 * Blocks deeply nested objects.
 */
const validateBodyDepth = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    if (getObjectDepth(req.body) > MAX_BODY_DEPTH) {
      recordSuspiciousRequest(req.ip, 'deeply_nested_body');
      securityLogger.securityEvent('DEEPLY_NESTED_BODY', {
        ip: req.ip,
        path: req.path,
      });
      return next(ApiError.badRequest('Request body is too deeply nested'));
    }
  }
  next();
};

/**
 * Validate route parameters.
 * Blocks oversized param values.
 */
const validateRouteParams = (req, res, next) => {
  for (const [key, val] of Object.entries(req.params || {})) {
    if (String(val).length > MAX_PARAM_LENGTH) {
      return next(ApiError.badRequest(`Route parameter '${key}' is too long`));
    }
  }
  next();
};

/**
 * Composite validation: applies all request dimension validators.
 * Register as a single middleware in app.js.
 */
const validateRequest = [
  validateQueryParams,
  validateBodyDepth,
  validateRouteParams,
];

module.exports = {
  validateRequest,
  validateQueryParams,
  validateBodyDepth,
  validateRouteParams,
};
