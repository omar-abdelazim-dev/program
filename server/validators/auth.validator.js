'use strict';

/**
 * @file validators/auth.validator.js
 * Validation chains for all authentication endpoints:
 * register, login, refresh, forgotPassword, resetPassword, verifyEmail.
 */

const { body } = require('express-validator');
const { validateEmail, validatePassword, validatePhone, validateString } = require('./common.validator');

// ── Register ──────────────────────────────────────────────────────────────

const validateRegister = [
  validateString('firstName', { min: 2, max: 50 }),
  validateString('lastName',  { min: 2, max: 50 }),
  validateEmail(),
  validatePassword(),
  validatePhone('phone', false),
];

// ── Login ─────────────────────────────────────────────────────────────────

const validateLogin = [
  validateEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString().withMessage('Password must be a string'),
  // Do NOT apply complexity rules on login — just verify presence
];

// ── Refresh Token ─────────────────────────────────────────────────────────

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string'),
];

// ── Forgot Password ───────────────────────────────────────────────────────

const validateForgotPassword = [
  validateEmail(),
];

// ── Reset Password ────────────────────────────────────────────────────────

const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isString().withMessage('Reset token must be a string'),
  validatePassword('newPassword'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// ── Verify Email ──────────────────────────────────────────────────────────

const validateVerifyEmail = [
  body('token')
    .notEmpty().withMessage('Verification token is required')
    .isString().withMessage('Token must be a string'),
];

// ── Change Password ───────────────────────────────────────────────────────

const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  validatePassword('newPassword'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateChangePassword,
};
