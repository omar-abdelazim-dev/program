'use strict';

/**
 * @file config/env/production.js
 * @description Production-specific configuration overrides.
 *
 * This file is loaded ONLY when NODE_ENV === 'production'.
 * All settings here prioritise security, performance, and reliability.
 *
 * NOTE: Never place real secrets here. All secrets must come from
 * the actual .env file loaded by dotenv (or your secret manager).
 */

module.exports = {
  /**
   * Log level for production — only warnings and errors are surfaced.
   * Debug/info noise is suppressed to keep logs clean and cheap.
   */
  logLevel: 'warn',

  /**
   * Enforce strict TLS certificate validation in production.
   */
  nodeEnvFlags: {
    rejectUnauthorized: true,
  },

  /**
   * CORS origin in production must be an explicit, pre-approved domain.
   * Falls back to the env variable; an empty / missing value is caught
   * by the validator in config/index.js before the app boots.
   */
  corsOrigin: process.env.CORS_ORIGIN,

  /**
   * Cookie settings for production.
   * `secure: true` ensures cookies are only sent over HTTPS.
   * `sameSite: 'strict'` mitigates CSRF.
   */
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
};
