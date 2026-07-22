/**
 * Admin input validators using express-validator.
 *
 * OWASP: A03:2021 – Injection, A01:2021 – Broken Access Control
 */

import { body, param, validationResult } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

// ─── Valid roles (mirrors the ASSIGNABLE_ROLES in adminController.js) ───────
const ASSIGNABLE_ROLES = ['student', 'instructor', 'admin'];

// ─── Validate MongoDB ObjectId params ────────────────────────────────────────
export const validateUserIdParam = [
  param('id')
    .trim()
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  handleValidationErrors,
];

// ─── Validate role change body ────────────────────────────────────────────────
export const validateRoleChange = [
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isIn(ASSIGNABLE_ROLES).withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),

  handleValidationErrors,
];
