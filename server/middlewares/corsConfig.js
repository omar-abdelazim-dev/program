'use strict';

/**
 * @file middlewares/corsConfig.js
 * CORS configuration with strict origin whitelist.
 *
 * - Only origins listed in CORS_ORIGIN (comma-separated) are allowed.
 * - Credentials (cookies, Authorization headers) are enabled.
 * - Requests from unknown origins receive a 403 — no CORS headers sent.
 *
 * OWASP ASVS §14.5 — Validate HTTP Request Headers
 */

const cors = require('cors');
const ApiError = require('../utils/ApiError');
const { logger } = require('../utils/logger');

// Build the whitelist from env (supports multiple origins separated by commas)
const buildWhitelist = () => {
  const raw = process.env.CORS_ORIGIN || '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
};

const corsOptions = {
  origin: (origin, callback) => {
    const whitelist = buildWhitelist();

    // Allow requests with no Origin (e.g. mobile apps, curl, Postman in dev)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        // In production, require an Origin header
        logger.warn('CORS: request with no Origin rejected in production');
        return callback(new Error('CORS: Origin header required in production'));
      }
      return callback(null, true);
    }

    if (whitelist.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS: rejected origin → ${origin}`);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },

  credentials: true, // Allow Authorization headers and cookies

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Accept-Language',
    'X-CSRF-Token',
  ],

  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],

  optionsSuccessStatus: 204, // Some legacy browsers choke on 200 for OPTIONS
  maxAge: 86400,             // Cache preflight for 24 hours
};

module.exports = cors(corsOptions);
