'use strict';

/**
 * @file tests/helpers/testApp.js
 * Creates a clean Express app instance for testing.
 * Sets up a test MongoDB connection using the test DB URI.
 */

process.env.NODE_ENV = 'test';
// Minimal required env for tests
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-that-is-long-enough-for-tests-1234';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-for-tests-5678';
process.env.JWT_ACCESS_EXPIRY  = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.MONGO_URI          = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/program_test';
process.env.CORS_ORIGIN        = 'http://localhost:3000';
process.env.EMAIL_HOST         = 'smtp.test.com';
process.env.EMAIL_PORT         = '587';
process.env.EMAIL_USER         = 'test@test.com';
process.env.EMAIL_PASS         = 'testpass';
process.env.EMAIL_FROM         = 'Test App <test@test.com>';
process.env.STRIPE_SECRET_KEY  = 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
process.env.CLOUD_STORAGE_ACCESS_KEY = 'test-access-key';
process.env.CLOUD_STORAGE_SECRET_KEY = 'test-secret-key';
process.env.CLOUD_STORAGE_BUCKET     = 'test-bucket';
process.env.CLOUD_STORAGE_REGION     = 'us-east-1';
process.env.COOKIE_SECRET      = 'test-cookie-secret-that-is-at-least-32-chars-long';
process.env.CSRF_SECRET        = 'test-csrf-secret-that-is-at-least-32-chars-long!!';
process.env.DOWNLOAD_SECRET    = 'test-download-secret-32-chars-min';

const mongoose = require('mongoose');
const app = require('../../app');

const connectTestDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

const disconnectTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clearDb = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { app, connectTestDb, disconnectTestDb, clearDb };
