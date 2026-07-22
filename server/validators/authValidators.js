/**
 * Auth input validators using express-validator.
 *
 * Each exported array is a middleware chain: validation rules + the
 * handleValidationErrors terminator. Pass the array directly into
 * the route definition before the controller.
 *
 * Example:
 *   router.post('/register', validateRegister, register);
 *
 * OWASP: A03:2021 – Injection, A04:2021 – Insecure Design
 */

import { body, validationResult } from 'express-validator';
import { PASSWORD_POLICY } from '../config/security.js';

// ─── Shared helper ───────────────────────────────────────────────────────────

/**
 * Final middleware in every validation chain.
 * Collects express-validator errors and short-circuits with 400 if any exist.
 * The first error message is returned — same { message } shape as the rest of the API.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

// ─── Password policy validator ───────────────────────────────────────────────

/**
 * Validates a password string against the PASSWORD_POLICY constants.
 * Returns an error message string, or null if the password is valid.
 * Used by both express-validator chains and controller-level checks.
 */
export const checkPasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    return `Password must be at least ${PASSWORD_POLICY.minLength} characters`;
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null; // valid
};

// express-validator custom validator that delegates to checkPasswordPolicy
const passwordValidator = body('password')
  .notEmpty().withMessage('Password is required')
  .custom((value) => {
    const err = checkPasswordPolicy(value);
    if (err) throw new Error(err);
    return true;
  });

const newPasswordValidator = body('newPassword')
  .notEmpty().withMessage('New password is required')
  .custom((value) => {
    const err = checkPasswordPolicy(value);
    if (err) throw new Error(err);
    return true;
  });

// ─── Validate Register ───────────────────────────────────────────────────────
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  passwordValidator,

  handleValidationErrors,
];

// ─── Validate Login ──────────────────────────────────────────────────────────
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

// ─── Validate Change Password ────────────────────────────────────────────────
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  newPasswordValidator,

  body('newPassword')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from the current password');
      }
      return true;
    }),

  handleValidationErrors,
];

// ─── Validate Check Email ────────────────────────────────────────────────────
export const validateCheckEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  handleValidationErrors,
];

// ─── Validate Update Profile ─────────────────────────────────────────────────
export const validateUpdateProfile = [
  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .isString().withMessage('Email must be a string')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('avatarUrl')
    .optional()
    .isString().withMessage('Avatar URL must be a string'),

  handleValidationErrors,
];

// ─── Validate Verify Email ───────────────────────────────────────────────────
export const validateVerifyEmail = [
  body('token')
    .trim()
    .notEmpty().withMessage('Verification token is required')
    .isHexadecimal().withMessage('Invalid token format'),

  handleValidationErrors,
];
