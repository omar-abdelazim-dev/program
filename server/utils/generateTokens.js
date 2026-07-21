'use strict';

/**
 * @file utils/generateTokens.js
 * JWT access + refresh token generation.
 * Payload is minimal — only userId and role — no sensitive data.
 * Secrets and expiry values come from the validated config object.
 *
 * Supports both HS256 (symmetric) and RS256 (asymmetric) algorithms.
 * If privateKey is provided, RS256 is used with the specified kid.
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate a short-lived JWT access token.
 * @param {object} payload - { userId, role }
 * @returns {string}
 */
const generateAccessToken = (payload) => {
  const options = {
    expiresIn: config.jwt.accessExpiry,
    algorithm: config.jwt.privateKey ? 'RS256' : 'HS256',
    keyid: config.jwt.kid,
  };
  const secretOrKey = config.jwt.privateKey || config.jwt.accessSecret;

  return jwt.sign(
    { sub: payload.userId, role: payload.role, type: 'access', jti: uuidv4() },
    secretOrKey,
    options
  );
};

/**
 * Generate a long-lived JWT refresh token.
 * @param {object} payload - { userId, role }
 * @returns {string}
 */
const generateRefreshToken = (payload) => {
  const jti = uuidv4();
  const options = {
    expiresIn: config.jwt.refreshExpiry,
    algorithm: config.jwt.privateKey ? 'RS256' : 'HS256',
    keyid: config.jwt.kid,
  };
  const secretOrKey = config.jwt.privateKey || config.jwt.refreshSecret;

  return jwt.sign(
    { sub: payload.userId, role: payload.role, type: 'refresh', jti },
    secretOrKey,
    options
  );
};

/**
 * Verify an access token. Throws on invalid / expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyAccessToken = (token) => {
  const secretOrKey = config.jwt.publicKey || config.jwt.accessSecret;
  const algorithms = config.jwt.publicKey ? ['RS256', 'HS256'] : ['HS256'];
  return jwt.verify(token, secretOrKey, { algorithms });
};

/**
 * Verify a refresh token. Throws on invalid / expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyRefreshToken = (token) => {
  const secretOrKey = config.jwt.publicKey || config.jwt.refreshSecret;
  const algorithms = config.jwt.publicKey ? ['RS256', 'HS256'] : ['HS256'];
  return jwt.verify(token, secretOrKey, { algorithms });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
