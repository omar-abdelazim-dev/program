'use strict';

/**
 * @file config/env/development.js
 * @description Development-specific configuration overrides.
 *
 * This file is loaded ONLY when NODE_ENV === 'development'.
 * It exports environment-specific settings that override or extend
 * the base validated config (config/index.js).
 *
 * NOTE: Never place real secrets here. All secrets must come from
 * the actual .env file loaded by dotenv. This file only contains
 * safe, non-secret, development-friendly defaults (e.g. log level).
 */

module.exports = {
  /**
   * Log level for development — verbose output is useful locally.
   * In production this is overridden to 'warn' or 'error'.
   */
  logLevel: 'debug',

  /**
   * Allow self-signed TLS certificates in dev (e.g. local HTTPS proxies).
   * NEVER set this to true in production.
   */
  nodeEnvFlags: {
    rejectUnauthorized: false,
  },

  /**
   * CORS origin is relaxed in development to allow any localhost port.
   * In production, only specific, pre-approved origins are allowed.
   */
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  /**
   * Cookie settings for development.
   * `secure: false` allows cookies over plain HTTP during local testing.
   */
  cookieOptions: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
};
