'use strict';

/**
 * @file routes/auth.routes.js
 * Authentication routes.
 *
 * Each route applies:
 *  - A dedicated rate limiter (not the global one)
 *  - Express-validator chains
 *  - The validate() middleware to collect errors
 *  - The controller handler (wrapped in asyncHandler)
 */

const { Router } = require('express');
const router = Router();

const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
} = require('../middlewares/rateLimiter');

const {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
} = require('../validators/auth.validator');

// POST /api/v1/auth/register
router.post(
  '/register',
  registerLimiter,
  validateRegister,
  validate,
  authController.register
);

// POST /api/v1/auth/login
router.post(
  '/login',
  loginLimiter,
  validateLogin,
  validate,
  authController.login
);

// POST /api/v1/auth/logout  (requires valid access token)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  authController.refreshToken
  // No auth middleware — refresh token IS the credential
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateForgotPassword,
  validate,
  authController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validateResetPassword,
  validate,
  authController.resetPassword
);

// POST /api/v1/auth/verify-email
router.post(
  '/verify-email',
  otpLimiter,
  validateVerifyEmail,
  validate,
  authController.verifyEmail
);

// GET /api/v1/auth/me  (protected)
router.get(
  '/me',
  authenticate,
  authController.getMe
);

module.exports = router;
