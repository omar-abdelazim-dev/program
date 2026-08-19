import { validateEnvironment, EnvironmentValidationError } from './config/env.js';

const validProductionEnv = {
  NODE_ENV: 'production',
  PORT: '5050',
  MONGO_URI: 'mongodb+srv://user:password@example.mongodb.net/program',
  JWT_SECRET: 'j'.repeat(64),
  OTP_SECRET: 'o'.repeat(32),
  CLIENT_URL: 'https://program.example.com,https://admin.program.example.com',
  CLOUDINARY_CLOUD_NAME: 'program',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'cloudinary-secret',
  GMAIL_USER: 'mailer@example.com',
  GMAIL_APP_PASSWORD: 'google-app-password',
  OTP_EXPIRY_MINUTES: '10',
  OTP_RESEND_COOLDOWN_SECONDS: '60',
  PAYOUT_APPROVAL_THRESHOLD: '5000',
  LOG_LEVEL: 'info',
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const expectInvalid = (env, expectedMessage) => {
  try {
    validateEnvironment(env);
    throw new Error(`Expected validation to fail with: ${expectedMessage}`);
  } catch (error) {
    assert(error instanceof EnvironmentValidationError, `Unexpected error: ${error.message}`);
    assert(error.message.includes(expectedMessage), `Expected "${expectedMessage}" in "${error.message}"`);
  }
};

const config = validateEnvironment(validProductionEnv);
assert(config.isProduction, 'Production environment should be identified');
assert(config.port === 5050, 'PORT should be parsed as a number');
assert(config.origins.length === 2, 'Comma-separated CLIENT_URL origins should be parsed');

expectInvalid({ ...validProductionEnv, JWT_SECRET: 'short' }, 'JWT_SECRET must be at least 64 characters');
expectInvalid({ ...validProductionEnv, OTP_SECRET: validProductionEnv.JWT_SECRET }, 'JWT_SECRET and OTP_SECRET must be different');
expectInvalid({ ...validProductionEnv, CLIENT_URL: 'http://program.example.com' }, 'must use HTTPS');
expectInvalid({ ...validProductionEnv, CLOUDINARY_API_SECRET: 'your_api_secret' }, 'CLOUDINARY_API_SECRET is required');
expectInvalid({ ...validProductionEnv, PORT: '70000' }, 'PORT must be at most 65535');

console.log('ALL ENVIRONMENT VALIDATION TESTS PASSED');
