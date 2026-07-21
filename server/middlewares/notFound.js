'use strict';

/**
 * @file middlewares/notFound.js
 * Catches all requests that don't match any route and forwards
 * a 404 ApiError to the centralised error handler.
 *
 * Must be registered AFTER all routers and BEFORE errorHandler.
 */

const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
