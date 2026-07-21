'use strict';

/**
 * @file validators/common.validator.js
 * Reusable express-validator chains for shared field types.
 * Used across auth, user, and resource validators.
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// ── ObjectId ──────────────────────────────────────────────────────────────

/**
 * Validate that a route param is a valid MongoDB ObjectId.
 * @param {string} paramName - Route parameter name (default: 'id')
 */
const validateObjectId = (paramName = 'id') =>
  param(paramName)
    .notEmpty().withMessage(`${paramName} is required`)
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error(`${paramName} must be a valid ObjectId`);
      }
      return true;
    });

// ── Email ─────────────────────────────────────────────────────────────────

const validateEmail = (field = 'email') =>
  body(field)
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 254 }).withMessage('Email cannot exceed 254 characters');

// ── Password ──────────────────────────────────────────────────────────────

const validatePassword = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Password cannot exceed 128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one digit')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character')
    .not().matches(/\s/).withMessage('Password must not contain whitespace');

// ── Phone ─────────────────────────────────────────────────────────────────

const validatePhone = (field = 'phone', required = false) => {
  const chain = body(field);
  if (!required) chain.optional({ nullable: true, checkFalsy: true });
  return chain
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Must be a valid international phone number (e.g. +1234567890)');
};

// ── Pagination query params ───────────────────────────────────────────────

const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// ── String field (generic) ────────────────────────────────────────────────

const validateString = (field, { min = 1, max = 500, required = true } = {}) => {
  const chain = body(field);
  if (!required) chain.optional();
  return chain
    .isString().withMessage(`${field} must be a string`)
    .trim()
    .isLength({ min, max }).withMessage(`${field} must be between ${min} and ${max} characters`);
};

module.exports = {
  validateObjectId,
  validateEmail,
  validatePassword,
  validatePhone,
  validatePagination,
  validateString,
};
