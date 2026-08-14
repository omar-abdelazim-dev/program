import { body } from 'express-validator';
import { handleValidationErrors } from './authValidators.js';

export const validateCreateStandaloneLesson = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 150 }).withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

  body('relatedCourseId')
    .notEmpty().withMessage('A related course is required')
    .isMongoId().withMessage('relatedCourseId must be a valid course id'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  body('videoUrl')
    .trim()
    .notEmpty().withMessage('Video URL is required'),

  handleValidationErrors,
];

export const validateUpdateStandaloneLesson = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('Title must be between 3 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  handleValidationErrors,
];
