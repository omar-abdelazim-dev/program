const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);
const VALID_LOG_LEVELS = new Set(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);
const PLACEHOLDER_PATTERN = /^(change_me|replace_with|your_|example|todo)/i;

const isMissingOrPlaceholder = (value) => {
  const normalized = String(value || '').trim();
  return !normalized || PLACEHOLDER_PATTERN.test(normalized);
};

const requireSecret = (env, key, errors, minimumLength = 32) => {
  const value = env[key];
  if (isMissingOrPlaceholder(value)) {
    errors.push(`${key} is required and must not be a placeholder`);
  } else if (value.length < minimumLength) {
    errors.push(`${key} must be at least ${minimumLength} characters`);
  }
};

const validatePositiveNumber = (env, key, errors, { integer = false } = {}) => {
  if (env[key] === undefined || env[key] === '') return;
  const value = Number(env[key]);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    errors.push(`${key} must be a positive${integer ? ' integer' : ' number'}`);
  }
};

export class EnvironmentValidationError extends Error {
  constructor(errors) {
    super(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
    this.name = 'EnvironmentValidationError';
    this.errors = errors;
  }
}

export const validateEnvironment = (env = process.env) => {
  const errors = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${[...VALID_NODE_ENVS].join(', ')}`);
  }

  if (isMissingOrPlaceholder(env.MONGO_URI)) {
    errors.push('MONGO_URI is required and must not be a placeholder');
  } else if (!/^mongodb(?:\+srv)?:\/\//.test(env.MONGO_URI)) {
    errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://');
  }

  if (isProduction) {
    requireSecret(env, 'JWT_SECRET', errors, 64);
    requireSecret(env, 'OTP_SECRET', errors, 32);

    if (env.JWT_SECRET && env.OTP_SECRET && env.JWT_SECRET === env.OTP_SECRET) {
      errors.push('JWT_SECRET and OTP_SECRET must be different values');
    }

    for (const key of [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'GMAIL_USER',
      'GMAIL_APP_PASSWORD',
    ]) {
      if (isMissingOrPlaceholder(env[key])) {
        errors.push(`${key} is required in production and must not be a placeholder`);
      }
    }

    if (env.GMAIL_USER && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.GMAIL_USER)) {
      errors.push('GMAIL_USER must be a valid email address');
    }
  } else if (isMissingOrPlaceholder(env.JWT_SECRET)) {
    errors.push('JWT_SECRET is required and must not be a placeholder');
  }

  const origins = String(env.CLIENT_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (isProduction && origins.length === 0) {
    errors.push('CLIENT_URL must contain at least one frontend origin in production');
  }
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (parsed.origin !== origin) {
        errors.push(`CLIENT_URL entry must be an origin without a path or trailing slash: ${origin}`);
      }
      if (isProduction && parsed.protocol !== 'https:') {
        errors.push(`CLIENT_URL entries must use HTTPS in production: ${origin}`);
      }
    } catch {
      errors.push(`CLIENT_URL contains an invalid URL: ${origin}`);
    }
  }

  validatePositiveNumber(env, 'OTP_EXPIRY_MINUTES', errors, { integer: true });
  validatePositiveNumber(env, 'OTP_RESEND_COOLDOWN_SECONDS', errors, { integer: true });
  validatePositiveNumber(env, 'PAYOUT_APPROVAL_THRESHOLD', errors);
  validatePositiveNumber(env, 'PORT', errors, { integer: true });

  if (env.SENTRY_TRACES_SAMPLE_RATE !== undefined && env.SENTRY_TRACES_SAMPLE_RATE !== '') {
    const sampleRate = Number(env.SENTRY_TRACES_SAMPLE_RATE);
    if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
      errors.push('SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1');
    }
  }

  const port = Number(env.PORT || 5000);
  if (Number.isFinite(port) && port > 65535) errors.push('PORT must be at most 65535');

  if (env.LOG_LEVEL && !VALID_LOG_LEVELS.has(env.LOG_LEVEL)) {
    errors.push(`LOG_LEVEL must be one of: ${[...VALID_LOG_LEVELS].join(', ')}`);
  }

  if (errors.length) throw new EnvironmentValidationError(errors);

  return { nodeEnv, isProduction, port, origins };
};
