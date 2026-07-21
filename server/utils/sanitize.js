'use strict';

/**
 * @file utils/sanitize.js
 * XSS sanitization helpers using the `xss` library.
 * Applied to request bodies AFTER NoSQL sanitization.
 *
 * All string values in req.body, req.query, and req.params are
 * recursively sanitized before reaching any controller.
 */

const xss = require('xss');

const xssOptions = {
  whiteList: {}, // Strip ALL HTML tags — no exceptions
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

const xssFilter = new xss.FilterXSS(xssOptions);

/**
 * Recursively sanitize all string values in an object.
 * @param {*} data
 * @returns {*} sanitized clone
 */
const sanitizeValue = (data) => {
  if (typeof data === 'string') {
    return xssFilter.process(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeValue);
  }
  if (data !== null && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
  }
  return data;
};

module.exports = { sanitizeValue };
