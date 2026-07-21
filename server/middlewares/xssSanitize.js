'use strict';

/**
 * @file middlewares/xssSanitize.js
 * XSS protection middleware.
 *
 * Recursively sanitizes all string values in req.body, req.query,
 * and req.params using the `xss` library (strip-all-HTML mode).
 *
 * This runs AFTER NoSQL sanitization in the middleware chain.
 * OWASP Top 10: A03 — Injection / A07 — XSS
 */

const { sanitizeValue } = require('../utils/sanitize');
const { securityLogger } = require('../utils/logger');

const xssSanitize = (req, _res, next) => {
  // Track if any sanitization occurred (for logging)
  const bodyStr   = JSON.stringify(req.body   || {});
  const queryStr  = JSON.stringify(req.query  || {});
  const paramsStr = JSON.stringify(req.params || {});

  req.body   = sanitizeValue(req.body);
  req.query  = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);

  // Log if content changed (indicates an XSS attempt)
  if (
    JSON.stringify(req.body)   !== bodyStr   ||
    JSON.stringify(req.query)  !== queryStr  ||
    JSON.stringify(req.params) !== paramsStr
  ) {
    securityLogger.securityEvent('XSS_ATTEMPT_SANITIZED', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
  }

  next();
};

module.exports = xssSanitize;
