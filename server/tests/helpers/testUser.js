'use strict';

/**
 * @file tests/helpers/testUser.js
 * Factory helpers for creating test users, tokens, and fixtures.
 */

const User = require('../../models/User');
const { hashPassword } = require('../../utils/passwordUtils');
const { generateAccessToken, generateRefreshToken } = require('../../utils/generateTokens');

const DEFAULT_PASSWORD = 'TestPass@123';

/**
 * Create a persisted test user in the DB.
 * @param {object} overrides - Partial user fields
 * @returns {Promise<{ user: Document, accessToken: string, refreshToken: string }>}
 */
const createTestUser = async (overrides = {}) => {
  const hashedPassword = await hashPassword(overrides.password || DEFAULT_PASSWORD);

  const user = await User.create({
    firstName: 'Test',
    lastName:  'User',
    email:     `test_${Date.now()}@example.com`,
    password:  hashedPassword,
    isEmailVerified: true,
    isActive: true,
    role: 'student',
    ...overrides,
    password: hashedPassword,
  });

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { user, accessToken, refreshToken, password: DEFAULT_PASSWORD };
};

/**
 * Create a test admin user.
 */
const createTestAdmin = (overrides = {}) =>
  createTestUser({ role: 'admin', ...overrides });

/**
 * Create a test instructor user.
 */
const createTestInstructor = (overrides = {}) =>
  createTestUser({ role: 'instructor', isApproved: true, ...overrides });

module.exports = { createTestUser, createTestAdmin, createTestInstructor, DEFAULT_PASSWORD };
