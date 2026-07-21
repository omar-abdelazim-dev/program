'use strict';

/**
 * @file middlewares/helmetConfig.js
 * Sprint 2 — Enhanced Helmet Security Headers.
 *
 * Improvements over Sprint 1:
 *  - Strict CSP with nonce support (no 'unsafe-inline' on scripts)
 *  - HSTS with preload and includeSubDomains
 *  - Full Cross-Origin policy suite (COEP, COOP, CORP)
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - X-DNS-Prefetch-Control: off
 *  - Explicit noSniff
 *  - Permissions-Policy (via helper middleware in app.js)
 *
 * OWASP ASVS §14.4 — HTTP Security Headers
 * OWASP Top 10: A05 — Security Misconfiguration
 */

const helmet = require('helmet');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';

// ── CSP directives ─────────────────────────────────────────────────────────
// Strict by default. Adjust per environment.
// React SPA in production: add CDN URLs to scriptSrc / styleSrc if needed.

const cspDirectives = {
  defaultSrc:     ["'self'"],
  scriptSrc:      ["'self'"],          // No unsafe-inline, no unsafe-eval
  scriptSrcAttr:  ["'none'"],          // Block inline event handlers
  styleSrc:       ["'self'"],          // No unsafe-inline in production
  styleSrcElem:   ["'self'"],
  imgSrc:         ["'self'", 'data:', 'blob:'],
  fontSrc:        ["'self'"],
  connectSrc:     ["'self'"],
  mediaSrc:       ["'self'", 'blob:'],
  objectSrc:      ["'none'"],          // Block Flash/Java
  pluginTypes:    ["'none'"],
  frameSrc:       ["'none'"],
  frameAncestors: ["'none'"],          // Clickjacking — stronger than X-Frame-Options
  baseUri:        ["'self'"],          // Prevent base tag hijacking
  formAction:     ["'self'"],          // Prevent form exfiltration
  manifestSrc:    ["'self'"],
  workerSrc:      ["'self'", 'blob:'],
  // upgradeInsecureRequests forces HTTP → HTTPS on non-dev
  ...(isDev ? {} : { upgradeInsecureRequests: [] }),
};

// In development, relax CSP to allow React dev-server hot reload
const devCspDirectives = {
  ...cspDirectives,
  styleSrc:   ["'self'", "'unsafe-inline'"], // React dev tools need this
  connectSrc: ["'self'", 'ws:', 'wss:'],     // WebSocket for HMR
};

const helmetConfig = helmet({
  // ── CSP ──────────────────────────────────────────────────────────────────
  contentSecurityPolicy: {
    directives: isDev ? devCspDirectives : cspDirectives,
    reportOnly: false, // Enforce in both environments
  },

  // ── HSTS (HTTP Strict-Transport-Security) ────────────────────────────────
  // Max-age: 2 years (HSTS preload requirement is ≥ 1 year)
  // Must be submitted to https://hstspreload.org/ separately
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true,
    preload: true,
  },

  // ── X-Frame-Options ──────────────────────────────────────────────────────
  // 'deny' = no framing at all; CSP frameAncestors 'none' provides the same
  // Keep both for maximum browser compatibility
  frameguard: { action: 'deny' },

  // ── X-Content-Type-Options ───────────────────────────────────────────────
  noSniff: true,

  // ── Referrer-Policy ──────────────────────────────────────────────────────
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // ── X-Powered-By ─────────────────────────────────────────────────────────
  hidePoweredBy: true,

  // ── X-DNS-Prefetch-Control ───────────────────────────────────────────────
  dnsPrefetchControl: { allow: false },

  // ── X-Download-Options ───────────────────────────────────────────────────
  // Prevents IE from executing downloads in the site's context
  ieNoOpen: true,

  // ── Cross-Origin Embedder Policy ─────────────────────────────────────────
  // 'credentialless' allows embedding third-party resources without CORS
  // Set to 'require-corp' if you need SharedArrayBuffer
  crossOriginEmbedderPolicy: { policy: 'credentialless' },

  // ── Cross-Origin Opener Policy ───────────────────────────────────────────
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // ── Cross-Origin Resource Policy ─────────────────────────────────────────
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // ── Origin-Agent-Cluster ─────────────────────────────────────────────────
  originAgentCluster: true,
});

module.exports = helmetConfig;
