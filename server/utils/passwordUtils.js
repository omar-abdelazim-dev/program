'use strict';

/**
 * @file utils/passwordUtils.js
 * bcrypt helpers — hash and compare only.
 * Cost factor is read from config, minimum enforced at 12 (OWASP ASVS v4 §2.4.1).
 */

const bcrypt = require('bcryptjs');

const COST_FACTOR = Math.max(
  12,
  parseInt(process.env.BCRYPT_COST_FACTOR || '12', 10)
);

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(COST_FACTOR);
  return bcrypt.hash(password, salt);
};

/**
 * Timing-safe comparison of a plain-text password against a stored hash.
 * Uses bcrypt.compare — safe against timing attacks by design.
 * @param {string} plainText
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plainText, hash) => {
  return bcrypt.compare(plainText, hash);
};

module.exports = { hashPassword, verifyPassword, COST_FACTOR };
