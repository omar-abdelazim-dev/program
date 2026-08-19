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

export const INSTRUCTOR_STATUSES = [
  'student', 'graduate', 'employed', 'unemployed', 'teacher', 'doctor', 'teaching_assistant',
];
export const MAX_PROVIDED_COURSES = 20;
export const MAX_COURSE_NAME_LENGTH = 120;

const isValidProvidedCourses = (value) => {
  const courses = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  return courses !== null
    && courses.length <= MAX_PROVIDED_COURSES
    && courses.every((course) => typeof course === 'string' && course.trim().length > 0 && course.trim().length <= MAX_COURSE_NAME_LENGTH);
};

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
export const NAME_PATTERN = /^[a-zA-Z؀-ۿ\s]*$/;

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

  body('role')
    .optional()
    .isString().withMessage('Role must be a string')
    .isIn(['student', 'instructor']).withMessage('Role must be student or instructor'),

  body('instructorStatus')
    .if(body('role').equals('instructor'))
    .isString().withMessage('Instructor status is required')
    .isIn(INSTRUCTOR_STATUSES).withMessage('Invalid instructor status'),

  body('providedCourses')
    .if(body('role').equals('instructor'))
    .custom(isValidProvidedCourses).withMessage('Provide between 1 and 20 course names of up to 120 characters each'),

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

  body('instructorStatus')
    .optional()
    .isString().withMessage('Instructor status must be a string')
    .isIn(INSTRUCTOR_STATUSES).withMessage('Invalid instructor status'),

  body('providedCourses')
    .optional()
    .custom(isValidProvidedCourses).withMessage('Provide between 1 and 20 course names of up to 120 characters each'),

  handleValidationErrors,
];
