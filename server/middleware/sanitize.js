/**
 * Sanitization middleware — two separate exports:
 *
 *   mongoSanitizeMiddleware  — strips MongoDB operators ($, .) from user input
 *   xssSanitizeMiddleware   — escapes HTML/JS from user input
 *
 * Both are applied globally in app.js after the body parser.
 * They operate on req.body, req.query, and req.params recursively
 * so nested objects are also covered.
 *
 * OWASP Mapping:
 *   A03:2021 – Injection  (NoSQL injection protection)
 *   A03:2021 – Injection  (XSS via stored/reflected output)
 */

import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import { securityLogger } from '../utils/logger.js';

// ─── NoSQL Injection Protection ─────────────────────────────────────────────

/**
 * Recursively removes keys starting with '$' or containing '.'
 * from plain objects and arrays. Called as a secondary pass after
 * express-mongo-sanitize (which handles the most common cases) to
 * catch edge cases like deeply nested operator injection.
 *
 * @param {*}      value    - The value to sanitize
 * @param {string} location - 'body' | 'query' | 'params' (for logging)
 * @param {object} req      - Express request (for logging context)
 * @returns {{ cleaned: *, attacked: boolean }}
 */
const recursiveMongoCleaner = (value, location, req) => {
  let attacked = false;

  if (Array.isArray(value)) {
    const cleaned = value.map((item) => {
      const res = recursiveMongoCleaner(item, location, req);
      if (res.attacked) attacked = true;
      return res.cleaned;
    });
    return { cleaned, attacked };
  }

  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        attacked = true;
        // Drop the key entirely — do not include it in the output
        continue;
      }
      const res = recursiveMongoCleaner(val, location, req);
      if (res.attacked) attacked = true;
      cleaned[key] = res.cleaned;
    }
    return { cleaned, attacked };
  }

  return { cleaned: value, attacked: false };
};

// express-mongo-sanitize handles the primary layer; we add a recursive
// secondary pass for defence-in-depth.
const _primarySanitize = mongoSanitize({
  replaceWith: '_',
  allowDots: false,
  onSanitize: ({ req, key }) => {
    securityLogger.warn('NoSQL injection attempt detected by primary filter', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      key,
    });
  },
});

export const mongoSanitizeMiddleware = (req, res, next) => {
  // Primary pass: express-mongo-sanitize
  _primarySanitize(req, res, () => {
    // Secondary pass: recursive key scanner
    let attacked = false;

    for (const location of ['body', 'query', 'params']) {
      if (req[location] && typeof req[location] === 'object') {
        const { cleaned, attacked: a } = recursiveMongoCleaner(req[location], location, req);
        req[location] = cleaned;
        if (a) attacked = true;
      }
    }

    if (attacked) {
      securityLogger.warn('NoSQL injection attempt detected by recursive scanner', {
        ip: req.ip,
        method: req.method,
        path: req.path,
      });
    }

    next();
  });
};

// ─── XSS Protection ─────────────────────────────────────────────────────────

/**
 * Recursively applies xss() sanitization to all string values in
 * req.body, req.query, and req.params. Numbers, booleans, and nulls
 * are left untouched.
 */
const recursiveXssCleaner = (value) => {
  if (typeof value === 'string') {
    return xss(value, {
      // Allow no HTML tags in API input — we're not a CMS
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }

  if (Array.isArray(value)) {
    return value.map(recursiveXssCleaner);
  }

  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      cleaned[key] = recursiveXssCleaner(val);
    }
    return cleaned;
  }

  return value;
};

export const xssSanitizeMiddleware = (req, res, next) => {
  for (const location of ['body', 'query', 'params']) {
    if (req[location]) {
      req[location] = recursiveXssCleaner(req[location]);
    }
  }
  next();
};
