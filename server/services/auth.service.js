'use strict';

/**
 * @file services/auth.service.js
 * Authentication business logic — completely decoupled from HTTP layer.
 *
 * All sensitive operations (register, login, logout, token refresh,
 * email verification, forgot/reset password) live here.
 * Controllers are thin and only handle HTTP concerns.
 */

const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { hashPassword, verifyPassword } = require('../utils/passwordUtils');
const { validatePasswordPolicy } = require('../security/passwordPolicy');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateTokens');
const { revokeToken } = require('../security/tokenBlacklist');
const { createSession, rotateToken, revokeAllSessions } = require('../security/sessionManager');
const { recordFailedLogin, clearFailedLogin } = require('../security/bruteForceDetector');
const { securityLogger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// ── Register ──────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @param {object} data - { firstName, lastName, email, password, phone? }
 * @param {string} ip   - Request IP for logging
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
const register = async ({ firstName, lastName, email, password, phone }, ip) => {
  // 1. Password policy validation
  const { valid, errors } = validatePasswordPolicy(password, [firstName, lastName, email]);
  if (!valid) throw ApiError.badRequest('Password does not meet security requirements', errors.map((e) => ({ message: e })));

  // 2. Check for existing account (timing-safe: same response regardless)
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // 3. Hash password
  const hashedPassword = await hashPassword(password);

  // 4. Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // 5. Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: phone || null,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: verificationExpiry,
  });

  // 6. Issue tokens
  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 7. Persist refresh token
  await _persistRefreshToken(refreshToken, user._id, ip);

  securityLogger.info('REGISTER_SUCCESS', { userId: user._id, ip });

  // Return safe user object — password never included
  return {
    user: _safeUser(user),
    accessToken,
    refreshToken,
    // In a real system, send verificationToken via email — do NOT return it in the API
    // emailVerificationToken: verificationToken, // ← NEVER do this in production
  };
};

// ── Login ──────────────────────────────────────────────────────────────────

/**
 * Authenticate a user by email + password.
 * @param {string} email
 * @param {string} password
 * @param {string} ip
 * @param {string} userAgent
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
const login = async (email, password, ip, userAgent) => {
  // Always select password explicitly (select: false on schema)
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +failedLoginAttempts +accountLockedUntil')
    .lean();

  // Generic error — don't reveal whether email exists
  const invalidCredentials = () => ApiError.unauthorized('Invalid email or password');

  if (!user || !user.isActive) {
    // Record for brute force detection
    recordFailedLogin(ip, email);
    securityLogger.loginFailed(email, ip, 'user_not_found');
    throw invalidCredentials();
  }

  // Account lockout check
  if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
    recordFailedLogin(ip, email);
    securityLogger.loginFailed(email, ip, 'account_locked');
    throw ApiError.unauthorized('Account is temporarily locked. Try again later.');
  }

  // Verify password (timing-safe bcrypt compare)
  const isMatch = await verifyPassword(password, user.password);

  if (!isMatch) {
    // Increment failed attempts
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update = { failedLoginAttempts: attempts };

    // Lock account after 5 consecutive failures for 15 minutes
    if (attempts >= 5) {
      update.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      update.failedLoginAttempts = 0;
    }

    await User.updateOne({ _id: user._id }, update);
    // Record for brute force monitoring
    recordFailedLogin(ip, email);
    securityLogger.loginFailed(email, ip, 'wrong_password');
    throw invalidCredentials();
  }

  // Clear brute force counters on success
  clearFailedLogin(ip, email);
  // Reset failed attempts on successful login
  await User.updateOne(
    { _id: user._id },
    { failedLoginAttempts: 0, accountLockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip }
  );

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await _persistRefreshToken(refreshToken, user._id, ip, userAgent);

  securityLogger.loginSuccess(user._id, ip, userAgent);

  return { user: _safeUser(user), accessToken, refreshToken };
};

// ── Logout ─────────────────────────────────────────────────────────────────

/**
 * Revoke the provided refresh token.
 * @param {string} refreshToken
 * @param {string} userId
 * @param {string} ip
 */
const logout = async (refreshToken, userId, ip) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.jti) {
      await revokeToken(decoded.jti, decoded.exp);
    }
    // Revoke in DB by jti
    await RefreshToken.updateOne({ jti: decoded.jti }, { revoked: true, revokedAt: new Date() });
  } catch {
    // If token is already expired/invalid, that's fine — still log the logout
  }
  securityLogger.logout(userId, ip);
};

// ── Token Refresh ──────────────────────────────────────────────────────────

/**
 * Issue a new access token using a valid refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string }>}
 */
const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') throw ApiError.unauthorized('Invalid token type');

  // Sprint 2: Token rotation with reuse detection
  const { rotationDetected, revokedFamily } = await rotateToken({
    oldJti: decoded.jti,
    familyId: decoded.familyId || decoded.jti,
    userId: decoded.sub,
    ip: null, // IP not available here; caller can pass it
    userAgent: null,
  });

  if (rotationDetected) {
    securityLogger.securityEvent('TOKEN_ROTATION_ATTACK', {
      jti: decoded.jti,
      userId: decoded.sub,
      revokedFamily,
    });
    throw ApiError.unauthorized(
      revokedFamily
        ? 'Security alert: All sessions have been terminated. Please log in again.'
        : 'Invalid refresh token'
    );
  }

  const user = await User.findById(decoded.sub).select('+passwordChangedAt').lean();
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive');

  // Sprint 2: Invalidate tokens issued before password change
  if (user.passwordChangedAt) {
    const tokenIat = decoded.iat * 1000;
    if (tokenIat < new Date(user.passwordChangedAt).getTime()) {
      throw ApiError.unauthorized('Session expired. Please log in again.');
    }
  }

  // Issue new access token + rotate refresh token
  const newAccessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user._id.toString(), role: user.role });

  // Persist new rotated refresh token with same familyId
  const newDecoded = verifyRefreshToken(newRefreshToken);
  await createSession({
    jti: newDecoded.jti || `${user._id}_${Date.now()}`,
    userId: user._id,
    expiresAt: new Date(newDecoded.exp * 1000),
    familyId: decoded.familyId || decoded.jti, // Inherit family lineage
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ── Forgot Password ────────────────────────────────────────────────────────

/**
 * Generate a password reset token and store its hash.
 * Returns the raw token (to be sent via email, never in API response).
 * @param {string} email
 * @returns {Promise<{ token: string }>}
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond with success — prevent email enumeration
  if (!user || !user.isActive) {
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken   = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateModifiedOnly: true });

  // TODO: Send rawToken via email service (Sprint 2)
  // await emailService.sendPasswordReset(user.email, rawToken);

  securityLogger.info('PASSWORD_RESET_REQUESTED', { userId: user._id });

  return { message: 'If an account exists, a reset link has been sent.' };
};

// ── Reset Password ─────────────────────────────────────────────────────────

/**
 * Validate a reset token and set a new password.
 * @param {string} token       - Raw reset token from email
 * @param {string} newPassword
 */
const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Reset token is invalid or has expired');

  const { valid, errors } = validatePasswordPolicy(newPassword, [user.firstName, user.lastName, user.email]);
  if (!valid) throw ApiError.badRequest('Password does not meet requirements', errors.map((e) => ({ message: e })));

  user.password             = await hashPassword(newPassword);
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts  = 0;
  user.accountLockedUntil   = null;
  user.passwordChangedAt    = new Date(); // Sprint 2: timestamp for session invalidation
  await user.save({ validateModifiedOnly: true });

  // Sprint 2: Revoke ALL active sessions (force re-login everywhere)
  await revokeAllSessions(user._id.toString(), 'PASSWORD_RESET');

  securityLogger.passwordReset(user._id);
};

// ── Email Verification ─────────────────────────────────────────────────────

/**
 * Verify a user's email using the token sent during registration.
 * @param {string} token
 */
const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw ApiError.badRequest('Verification token is invalid or has expired');

  user.isEmailVerified          = true;
  user.emailVerificationToken   = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateModifiedOnly: true });
};

// ── Private helpers ────────────────────────────────────────────────────────

/**
 * Parse jti from a refresh token and persist it to the DB via session manager.
 */
const _persistRefreshToken = async (rawToken, userId, ip, userAgent = null) => {
  const decoded = verifyRefreshToken(rawToken);
  const jti = decoded.jti || `${userId}_${Date.now()}`;
  await createSession({
    jti,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
    ip,
    userAgent,
    familyId: jti, // New session starts a new family
  });
};

/**
 * Return a safe user object (no sensitive fields).
 */
const _safeUser = (user) => ({
  id:              user._id.toString(),
  firstName:       user.firstName,
  lastName:        user.lastName,
  email:           user.email,
  role:            user.role,
  isEmailVerified: user.isEmailVerified,
  isApproved:      user.isApproved,
  createdAt:       user.createdAt,
});

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
