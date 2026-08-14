/**
 * Course input validators using express-validator.
 * Returns clear, field-specific messages (INS-01) instead of the generic
 * "Title, description, price, and category are required" catch-all.
 */

import { body } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

export const validateCreateCourse = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 150 }).withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  body('category')
    .optional({ checkFalsy: true })
    .isString().withMessage('Category must be a string'),

  body('college')
    .notEmpty().withMessage('College is required')
    .isString().withMessage('College must be a string'),

  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isInt({ min: 1, max: 12 }).withMessage('Semester must be a valid number between 1 and 12'),

  body('courseType')
    .notEmpty().withMessage('Course type is required')
    .isIn(['full', 'ongoing']).withMessage("Course type must be 'full' or 'ongoing'"),

  handleValidationErrors,
];

export const validateRequestPriceChange = [
  body('requestedPrice')
    .notEmpty().withMessage('Requested price is required')
    .isFloat({ min: 0 }).withMessage('Requested price must be a number greater than or equal to 0'),

  handleValidationErrors,
];

export const validateConvertToFull = [
  body('price')
    .notEmpty().withMessage('A full-course price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  handleValidationErrors,
];

export const validateUpdateCourse = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

  body('category')
    .optional({ checkFalsy: true })
    .isString().withMessage('Category must be a string'),

  body('college')
    .notEmpty().withMessage('College is required')
    .isString().withMessage('College must be a string'),

  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isInt({ min: 1, max: 12 }).withMessage('Semester must be a valid number between 1 and 12'),

  handleValidationErrors,
];
