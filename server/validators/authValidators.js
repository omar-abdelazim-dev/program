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
import { validatePasswordStrength } from '../utils/passwordRules.js';

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
// The actual rule set lives in utils/passwordRules.js (validatePasswordStrength)
// — that's what every OTP-gated controller path (registration, password
// change/reset) calls directly. This is just the express-validator wiring
// for the one remaining route-level chain that still needs it.
const passwordValidator = body('password')
  .notEmpty().withMessage('Password is required')
  .custom((value) => {
    const err = validatePasswordStrength(value);
    if (err) throw new Error(err);
    return true;
  });

// Letters (Latin or Arabic) and spaces only — rejects digits/symbols so a
// name field can't be used to store arbitrary data.
const NAME_PATTERN = /^[a-zA-Z؀-ۿ\s]*$/;

// ─── Validate Register ───────────────────────────────────────────────────────
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(NAME_PATTERN).withMessage('Name can only contain letters and spaces'),

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
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(NAME_PATTERN).withMessage('Name can only contain letters and spaces'),

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
