'use strict';

/**
 * @file middlewares/csrf.js
 * Sprint 2 — CSRF Protection.
 *
 * Uses the `csrf-csrf` library (double-submit cookie pattern).
 * Works with JWT-based APIs by using:
 *  - A signed CSRF secret in an HttpOnly cookie
 *  - A CSRF token returned to the client in the response body
 *  - The client sends the token in the `x-csrf-token` header
 *
 * Protected routes: all state-changing methods (POST, PUT, PATCH, DELETE)
 * Public exceptions: /auth/login, /auth/register, /auth/refresh, /health
 *   — These are exempted because they don't operate on authenticated sessions
 *     and are protected by rate limiters instead.
 *
 * OWASP ASVS §4.2.2 — CSRF Prevention
 */

const { doubleCsrf } = require('csrf-csrf');
const config = require('../config');
const { securityLogger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.COOKIE_SECRET;

if (!CSRF_SECRET || CSRF_SECRET.length < 32) {
  throw new Error('CSRF_SECRET must be set and at least 32 characters');
}

// ── Routes that do NOT require CSRF token ──────────────────────────────────
// These are either:
//  a) Safe methods (GET, HEAD, OPTIONS) — never mutate state
//  b) Pre-auth endpoints protected by rate limiters
const CSRF_EXEMPT_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/health',
]);

const isCsrfExempt = (req) => {
  // GET, HEAD, OPTIONS never need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  return CSRF_EXEMPT_PATHS.has(req.path);
};

// ── csrf-csrf configuration ────────────────────────────────────────────────

const {
  generateToken,         // Call to get a CSRF token (send to client)
  doubleCsrfProtection,  // Middleware that validates the token
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,

  cookieName: '__Host-csrf',  // __Host- prefix enforces path=/ and secure=true

  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.app.env !== 'development',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Read token from x-csrf-token header (standard for SPAs)
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] || req.body?._csrf || req.query?._csrf,

  size: 64,            // Token entropy in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// ── Middleware: validate CSRF on protected routes ─────────────────────────

const csrfProtection = (req, res, next) => {
  if (isCsrfExempt(req)) return next();

  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      securityLogger.securityEvent('CSRF_VALIDATION_FAILED', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id || 'unauthenticated',
      });
      return next(ApiError.forbidden('CSRF token validation failed'));
    }
    next();
  });
};

// ── Middleware: issue CSRF token ───────────────────────────────────────────

/**
 * Attach a fresh CSRF token to any response that needs it.
 * Call this on login / register responses so the client can store the token.
 *
 * Usage:
 *   res.locals.csrfToken = generateToken(req, res);
 *   // Then include in response body
 */
const attachCsrfToken = (req, res, next) => {
  try {
    res.locals.csrfToken = generateToken(req, res, true); // true = reuse existing if valid
  } catch {
    res.locals.csrfToken = generateToken(req, res);
  }
  next();
};

module.exports = { csrfProtection, attachCsrfToken, generateToken };
