'use strict';

/**
 * @file middlewares/apiProtection.js
 * Sprint 2 — API Protection.
 *
 * Implements:
 *  - Request size limits (body, URL, headers)
 *  - HTTP Parameter Pollution (HPP) prevention
 *  - Unknown HTTP method rejection
 *  - Invalid Content-Type rejection on state-changing requests
 *  - Malformed JSON handling with safe error response
 *  - Accept header validation
 *  - Request header validation (dangerous characters)
 *
 * OWASP API Security Top 10: API4, API8
 * OWASP ASVS §12.1, §13.1
 */

const hpp = require('hpp');
const ApiError = require('../utils/ApiError');
const { securityLogger } = require('../utils/logger');
const { recordSuspiciousRequest } = require('../security/bruteForceDetector');

// ── 1. Allowed HTTP methods ────────────────────────────────────────────────

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Reject any HTTP method not in the explicit allowlist.
 */
const rejectUnknownMethods = (req, res, next) => {
  if (!ALLOWED_METHODS.has(req.method)) {
    recordSuspiciousRequest(req.ip, `unknown_method:${req.method}`);
    securityLogger.securityEvent('UNKNOWN_HTTP_METHOD', {
      method: req.method,
      ip: req.ip,
      path: req.path,
    });
    res.setHeader('Allow', [...ALLOWED_METHODS].join(', '));
    return next(ApiError.badRequest(`HTTP method ${req.method} is not allowed`));
  }
  next();
};

// ── 2. Content-Type enforcement ─────────────────────────────────────────────

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Enforce application/json Content-Type for state-changing requests.
 * Multipart/form-data is allowed for file upload routes (handled by multer).
 */
const enforceContentType = (req, res, next) => {
  if (!BODY_METHODS.has(req.method)) return next();

  // Skip multipart routes — multer handles them
  if (req.path.includes('/upload') || req.path.includes('/avatar')) return next();

  const contentType = req.headers['content-type'] || '';

  if (
    !contentType.includes('application/json') &&
    !contentType.includes('application/x-www-form-urlencoded')
  ) {
    recordSuspiciousRequest(req.ip, `invalid_content_type:${contentType}`);
    securityLogger.securityEvent('INVALID_CONTENT_TYPE', {
      ip: req.ip,
      path: req.path,
      contentType,
    });
    return next(ApiError.badRequest('Content-Type must be application/json'));
  }

  next();
};

// ── 3. Malformed JSON error handler ──────────────────────────────────────────

/**
 * Intercept JSON parse errors thrown by express.json() and return a safe 400.
 * Must be registered IMMEDIATELY after express.json() in app.js.
 */
const handleMalformedJson = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    recordSuspiciousRequest(req.ip, 'malformed_json');
    securityLogger.securityEvent('MALFORMED_JSON', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }
  next(err);
};

// ── 4. HTTP Parameter Pollution (HPP) prevention ──────────────────────────

/**
 * Prevent HPP attacks by picking the last value of duplicated query params.
 * Whitelist known array params like `tags`, `ids`.
 */
const hppProtection = hpp({
  whitelist: ['tags', 'ids', 'roles', 'categories', 'sort', 'fields'],
});

// ── 5. Request header validation ───────────────────────────────────────────

const HEADER_INJECTION_PATTERN = /[\r\n\0]/; // CRLF injection

/**
 * Scan common request headers for CRLF injection characters.
 * Logs and blocks requests with dangerous header values.
 */
const validateRequestHeaders = (req, res, next) => {
  const headersToCheck = [
    'user-agent',
    'referer',
    'origin',
    'x-forwarded-for',
    'x-real-ip',
  ];

  for (const header of headersToCheck) {
    const value = req.headers[header];
    if (value && HEADER_INJECTION_PATTERN.test(value)) {
      recordSuspiciousRequest(req.ip, `header_injection:${header}`);
      securityLogger.securityEvent('HEADER_INJECTION_ATTEMPT', {
        ip: req.ip,
        path: req.path,
        header,
      });
      return next(ApiError.badRequest('Invalid request headers'));
    }
  }

  // URL length check (prevent very long URLs)
  if (req.url.length > 2048) {
    recordSuspiciousRequest(req.ip, 'url_too_long');
    return next(ApiError.badRequest('Request URL is too long'));
  }

  next();
};

// ── 6. Accept header validation ─────────────────────────────────────────────

/**
 * Ensure the client accepts JSON responses on API routes.
 * Prevents content-sniffing attacks and misrouted requests.
 */
const validateAcceptHeader = (req, res, next) => {
  // Only enforce on /api/ routes
  if (!req.path.startsWith('/api/')) return next();
  // Skip OPTIONS preflight
  if (req.method === 'OPTIONS') return next();

  const accept = req.headers['accept'] || '';
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) {
    return next(ApiError.badRequest('API only serves application/json responses'));
  }

  next();
};

module.exports = {
  rejectUnknownMethods,
  enforceContentType,
  handleMalformedJson,
  hppProtection,
  validateRequestHeaders,
  validateAcceptHeader,
};
