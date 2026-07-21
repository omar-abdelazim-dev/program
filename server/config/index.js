'use strict';

/**
 * @file config/index.js
 * @description Centralised application configuration module.
 *
 * RESPONSIBILITIES
 * ─────────────────
 * 1. Load the correct .env file via dotenv (before anything else).
 * 2. Run the environment variable validator (exits on failure).
 * 3. Build and export a single, frozen config object used by the
 *    rest of the application.
 *
 * USAGE
 * ──────
 *   const config = require('./config');
 *   console.log(config.db.uri);        // MongoDB URI
 *   console.log(config.jwt.accessSecret);
 *
 * DESIGN DECISIONS
 * ─────────────────
 * • All values are read from process.env AFTER dotenv has loaded the
 *   .env file. We never hard-code defaults for secrets.
 * • The exported object is frozen with Object.freeze() so that no
 *   module can accidentally mutate it at runtime.
 * • Environment-specific overrides (corsOrigin, cookieOptions, logLevel)
 *   are merged in from config/env/<NODE_ENV>.js.
 */

const path = require('path');
const dotenv = require('dotenv');

// ─── Step 1: Load .env file ──────────────────────────────────────────────────
// Priority: .env.<NODE_ENV>.local → .env.<NODE_ENV> → .env
// dotenv.config() is idempotent; it will NOT overwrite already-set variables,
// which means shell-injected secrets (e.g. from Docker / K8s) always win.

const NODE_ENV = process.env.NODE_ENV || 'development';

// Load environment-specific file first (highest priority)
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${NODE_ENV}`),
});

// Fall back to the base .env file (lower priority — already-set vars are kept)
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// ─── Step 2: Validate all required env variables ─────────────────────────────
// This call will process.exit(1) if anything is wrong.
const { validateEnv } = require('./validateEnv');
validateEnv();

// ─── Step 3: Load environment-specific config overrides ─────────────────────
let envOverrides = {};
try {
  // Dynamically require the per-env file (development.js / production.js)
  envOverrides = require(`./env/${NODE_ENV}`);
} catch {
  // If there is no per-env file (e.g. NODE_ENV=test), that is acceptable.
}

// ─── Step 4: Build the frozen config object ──────────────────────────────────

const config = Object.freeze({
  // ── App ────────────────────────────────────────────────────────────────────
  app: Object.freeze({
    env: NODE_ENV,
    port: parseInt(process.env.PORT || '5000', 10),
    corsOrigin: envOverrides.corsOrigin || process.env.CORS_ORIGIN,
    logLevel: envOverrides.logLevel || 'info',
    cookieOptions: Object.freeze(
      envOverrides.cookieOptions || {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
      }
    ),
  }),

  // ── MongoDB ────────────────────────────────────────────────────────────────
  db: Object.freeze({
    /** Full MongoDB connection string. Never log this value. */
    uri: process.env.MONGO_URI,
    options: Object.freeze({
      // Recommended production-safe Mongoose options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }),
  }),

  // ── JSON Web Tokens ────────────────────────────────────────────────────────
  jwt: Object.freeze({
    /** Secret for signing short-lived access tokens. Never expose. */
    accessSecret: process.env.JWT_ACCESS_SECRET,
    /** Secret for signing long-lived refresh tokens. Never expose. */
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    /** Optional RSA Private Key for RS256. */
    privateKey: process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
    /** Optional RSA Public Key for RS256 validation. */
    publicKey: process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : null,
    /** Key ID for key rotation. */
    kid: process.env.JWT_KID || '1',
    /** Access token lifetime (e.g. '15m'). */
    accessExpiry: process.env.JWT_ACCESS_EXPIRY,
    /** Refresh token lifetime (e.g. '7d'). */
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY,
  }),

  // ── Email / SMTP ───────────────────────────────────────────────────────────
  email: Object.freeze({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    /** SMTP username or API key user. */
    user: process.env.EMAIL_USER,
    /** SMTP password or API key. Never log. */
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  }),

  // ── Payment Gateway (Stripe) ───────────────────────────────────────────────
  stripe: Object.freeze({
    /** Stripe secret API key (sk_live_* or sk_test_*). Never expose. */
    secretKey: process.env.STRIPE_SECRET_KEY,
    /** Stripe webhook signing secret (whsec_*). */
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  }),

  // ── Cloud Storage ──────────────────────────────────────────────────────────
  cloudStorage: Object.freeze({
    /** AWS Access Key ID (or S3-compatible equivalent). */
    accessKey: process.env.CLOUD_STORAGE_ACCESS_KEY,
    /** AWS Secret Access Key. Never log. */
    secretKey: process.env.CLOUD_STORAGE_SECRET_KEY,
    bucket: process.env.CLOUD_STORAGE_BUCKET,
    region: process.env.CLOUD_STORAGE_REGION,
    /** Optional: custom endpoint for S3-compatible services (e.g. MinIO). */
    endpoint: process.env.CLOUD_STORAGE_ENDPOINT || null,
  }),
});

module.exports = config;
