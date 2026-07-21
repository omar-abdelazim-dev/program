'use strict';

/**
 * @file config/validateEnv.js
 * @description Centralised environment variable validator.
 *
 * HOW IT WORKS
 * ─────────────
 * 1. `validateEnv()` is called ONCE at application startup, before
 *    any server, database, or service is initialised.
 * 2. It iterates over every rule defined in `ENV_RULES` and checks
 *    the current `process.env` object.
 * 3. For each missing or invalid variable it collects a descriptive
 *    error message.
 * 4. If ANY errors were found the process exits immediately with code 1,
 *    printing a formatted report so developers know exactly what to fix.
 *
 * RULES FORMAT
 * ─────────────
 * Each rule is an object with:
 *   • name      {string}   – The env variable name (e.g. 'MONGO_URI')
 *   • required  {boolean}  – Whether the variable must be present
 *   • validator {Function} – Optional fn(value) → true | string(error)
 *   • description {string} – Human-readable hint shown in the error report
 */

// ─── Rule definitions ────────────────────────────────────────────────────────

/** Reusable validator: value must be a non-empty string. */
const isNonEmpty = (val) =>
  (typeof val === 'string' && val.trim().length > 0) ||
  'must be a non-empty string';

/** Reusable validator: value must be a valid absolute URI. */
const isUri = (val) => {
  try {
    const url = new URL(val);
    return ['mongodb:', 'mongodb+srv:'].includes(url.protocol)
      ? true
      : 'must start with mongodb:// or mongodb+srv://';
  } catch {
    return 'must be a valid URI (e.g. mongodb+srv://user:pass@cluster.mongodb.net/db)';
  }
};

/** Reusable validator: value must be a Joi-style duration or integer seconds. */
const isDuration = (val) =>
  /^\d+[smhd]?$/.test(val) ||
  'must be a number (seconds) or a string like 15m, 1h, 7d';

/** Reusable validator: value must be a valid email address. */
const isEmail = (val) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'must be a valid email address';

/** Reusable validator: value must be at least N characters (default 32). */
const minLength = (n) => (val) =>
  (typeof val === 'string' && val.trim().length >= n) ||
  `must be at least ${n} characters long (current: ${val?.trim().length ?? 0})`;

/**
 * Master list of all required / optional environment variables.
 * Add a new entry here whenever a new secret or config value is introduced.
 */
const ENV_RULES = [
  // ── App ──────────────────────────────────────────────────────────────────
  {
    name: 'NODE_ENV',
    required: true,
    validator: (val) =>
      ['development', 'production', 'test'].includes(val) ||
      'must be one of: development | production | test',
    description: 'Runtime environment',
  },
  {
    name: 'PORT',
    required: false,
    validator: (val) =>
      /^\d+$/.test(val) && parseInt(val, 10) > 0 && parseInt(val, 10) <= 65535
        ? true
        : 'must be a valid port number between 1 and 65535',
    description: 'HTTP server port (default: 5000)',
  },
  {
    name: 'CORS_ORIGIN',
    required: true,
    validator: isNonEmpty,
    description: 'Allowed CORS origin (e.g. https://your-frontend.com)',
  },

  // ── MongoDB ───────────────────────────────────────────────────────────────
  {
    name: 'MONGO_URI',
    required: true,
    validator: isUri,
    description: 'Full MongoDB connection string',
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  {
    name: 'JWT_ACCESS_SECRET',
    required: true,
    validator: minLength(32),
    description: 'Secret for signing access tokens (≥ 32 chars)',
  },
  {
    name: 'JWT_REFRESH_SECRET',
    required: true,
    validator: minLength(32),
    description: 'Secret for signing refresh tokens (≥ 32 chars)',
  },
  {
    name: 'JWT_ACCESS_EXPIRY',
    required: true,
    validator: isDuration,
    description: 'Access token expiry (e.g. 15m)',
  },
  {
    name: 'JWT_REFRESH_EXPIRY',
    required: true,
    validator: isDuration,
    description: 'Refresh token expiry (e.g. 7d)',
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  {
    name: 'EMAIL_HOST',
    required: true,
    validator: isNonEmpty,
    description: 'SMTP host (e.g. smtp.sendgrid.net)',
  },
  {
    name: 'EMAIL_PORT',
    required: true,
    validator: (val) =>
      ['25', '465', '587', '2525'].includes(val) ||
      'must be one of: 25 | 465 | 587 | 2525',
    description: 'SMTP port',
  },
  {
    name: 'EMAIL_USER',
    required: true,
    validator: isEmail,
    description: 'SMTP authentication username / sender email',
  },
  {
    name: 'EMAIL_PASS',
    required: true,
    validator: isNonEmpty,
    description: 'SMTP authentication password or API key',
  },
  {
    name: 'EMAIL_FROM',
    required: true,
    validator: isNonEmpty,
    description: 'Default "From" display name (e.g. "MyApp <no-reply@myapp.com>")',
  },

  // ── Payment Gateway (Stripe) ──────────────────────────────────────────────
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    validator: (val) =>
      /^sk_(live|test)_/.test(val) ||
      'must start with sk_live_ or sk_test_ (Stripe secret key)',
    description: 'Stripe secret API key',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    validator: (val) =>
      /^whsec_/.test(val) ||
      'must start with whsec_ (Stripe webhook signing secret)',
    description: 'Stripe webhook endpoint signing secret',
  },

  // ── Cloud Storage (AWS S3 / compatible) ───────────────────────────────────
  {
    name: 'CLOUD_STORAGE_ACCESS_KEY',
    required: true,
    validator: isNonEmpty,
    description: 'Cloud storage access key (AWS Access Key ID or equivalent)',
  },
  {
    name: 'CLOUD_STORAGE_SECRET_KEY',
    required: true,
    validator: isNonEmpty,
    description: 'Cloud storage secret key (AWS Secret Access Key or equivalent)',
  },
  {
    name: 'CLOUD_STORAGE_BUCKET',
    required: true,
    validator: isNonEmpty,
    description: 'Cloud storage bucket name',
  },
  {
    name: 'CLOUD_STORAGE_REGION',
    required: true,
    validator: isNonEmpty,
    description: 'Cloud storage region (e.g. us-east-1)',
  },
];

// ─── Validator core ──────────────────────────────────────────────────────────

/**
 * Runs all ENV_RULES against `process.env` and terminates the process
 * if any required variable is missing or invalid.
 *
 * @returns {void}
 */
function validateEnv() {
  const errors = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.name];
    const isMissing = value === undefined || value === null || value === '';

    if (isMissing) {
      if (rule.required) {
        errors.push(
          `  ✖  ${rule.name.padEnd(30)} [MISSING]   ${rule.description}`
        );
      }
      // Optional + missing → skip further validation
      continue;
    }

    // Run the custom validator if provided
    if (rule.validator) {
      const result = rule.validator(value);
      if (result !== true) {
        errors.push(
          `  ✖  ${rule.name.padEnd(30)} [INVALID]   ${result}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n' + '═'.repeat(70));
    console.error('  🚨  ENVIRONMENT CONFIGURATION ERROR — Application cannot start');
    console.error('═'.repeat(70));
    console.error('\n  The following environment variables are missing or invalid:\n');
    errors.forEach((e) => console.error(e));
    console.error(
      '\n  Please check your .env file or secret manager configuration.'
    );
    console.error(
      '  Refer to .env.example for the full list of required variables.\n'
    );
    console.error('═'.repeat(70) + '\n');
    process.exit(1);
  }

  console.info('✔  Environment variables validated successfully.');
}

module.exports = { validateEnv, ENV_RULES };
