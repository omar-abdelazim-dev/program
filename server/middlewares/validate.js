'use strict';

/**
 * @file middlewares/validate.js
 * Express middleware that runs after express-validator chains.
 * Collects all validation errors and throws a 400 ApiError.
 * Must be placed as the LAST item in every validator array.
 */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return next(ApiError.badRequest('Validation failed', formatted));
  }

  next();
};

module.exports = validate;
