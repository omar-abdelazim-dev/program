'use strict';

/**
 * @file middlewares/authenticate.js
 * JWT authentication middleware.
 *
 * Reads Bearer token from Authorization header.
 * Verifies signature, expiry, token type, and blacklist status.
 * Attaches the decoded user payload to req.user.
 *
 * Never trusts client-supplied user IDs — all identity comes from
 * the verified JWT payload (OWASP ASVS §3.5).
 */

const { verifyAccessToken } = require('../utils/generateTokens');
const { isRevoked } = require('../security/tokenBlacklist');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const authenticate = asyncHandler(async (req, _res, next) => {
  // ── 1. Extract token ───────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  // ── 2. Verify signature and expiry ─────────────────────────────────────
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  // ── 3. Validate token type ─────────────────────────────────────────────
  if (decoded.type !== 'access') {
    throw ApiError.unauthorized('Invalid token type');
  }

  // ── 4. Check token blacklist ───────────────────────────────────────────
  if (decoded.jti && await isRevoked(decoded.jti)) {
    throw ApiError.unauthorized('Token has been revoked');
  }

  // ── 5. Load and validate user from DB ─────────────────────────────────
  // Always verify user still exists and is active — prevents deleted/banned
  // users from using tokens issued before their account was revoked.
  const user = await User.findById(decoded.sub).lean();

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User account does not exist or is inactive');
  }

  // ── 6. Attach to request ───────────────────────────────────────────────
  req.user = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
  };

  next();
});

module.exports = authenticate;
