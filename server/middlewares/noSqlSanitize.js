'use strict';

/**
 * @file middlewares/noSqlSanitize.js
 * Prevents MongoDB operator injection attacks.
 *
 * Strips keys that start with '$' or contain '.' from:
 *  - req.body
 *  - req.query
 *  - req.params
 *
 * Uses express-mongo-sanitize for the primary layer, then applies
 * a custom recursive check for any bypasses.
 *
 * OWASP Top 10: A03 — Injection
 */

const mongoSanitize = require('express-mongo-sanitize');
const ApiError = require('../utils/ApiError');
const { securityLogger } = require('../utils/logger');

// ── Primary layer: express-mongo-sanitize ─────────────────────────────────
// replaceWith: '_' replaces dangerous keys rather than removing them silently.
// This makes attacks visible in logs rather than silently dropping them.
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitizeError: (req, res) => {
    securityLogger.securityEvent('NOSQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(400).json({
      success: false,
      message: 'Request contains illegal characters',
    });
  },
});

// ── Secondary layer: custom deep scan ────────────────────────────────────
const MONGO_OPERATOR_REGEX = /^\$|^\./;

/**
 * Recursively scan an object for MongoDB operator keys.
 * @param {*} obj
 * @returns {boolean} true if suspicious content found
 */
const containsOperators = (obj) => {
  if (obj === null || typeof obj !== 'object') return false;
  for (const key of Object.keys(obj)) {
    if (MONGO_OPERATOR_REGEX.test(key)) return true;
    if (containsOperators(obj[key])) return true;
  }
  return false;
};

const deepScanMiddleware = (req, res, next) => {
  if (
    containsOperators(req.body)   ||
    containsOperators(req.query)  ||
    containsOperators(req.params)
  ) {
    securityLogger.securityEvent('NOSQL_DEEP_SCAN_BLOCKED', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return next(ApiError.badRequest('Request contains illegal operators'));
  }
  next();
};

module.exports = [mongoSanitizeMiddleware, deepScanMiddleware];
