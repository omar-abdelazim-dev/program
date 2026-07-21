'use strict';

/**
 * @file utils/asyncHandler.js
 * Wraps async route handlers, forwarding any rejected promise to Express next().
 * Eliminates try/catch boilerplate in every controller.
 */

/**
 * @param {Function} fn - Async express route handler.
 * @returns {Function} Express middleware that catches errors.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
