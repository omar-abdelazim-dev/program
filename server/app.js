'use strict';

/**
 * @file app.js
 * Express application factory — Enterprise Grade.
 *
 * Middleware order (MUST NOT change):
 *  1.  helmet             — security headers
 *  2.  permissionsPolicy  — custom header
 *  3.  cors               — CORS
 *  4.  requestId          — inject unique request IDs
 *  5.  metrics            — prometheus metrics
 *  6.  rejectUnknownMethods
 *  7.  validateRequestHeaders
 *  8.  express.json
 *  9.  handleMalformedJson
 * 10.  express.urlencoded
 * 11.  cookieParser
 * 12.  hppProtection
 * 13.  globalLimiter      — rate limit (Redis)
 * 14.  noSqlSanitize
 * 15.  xssSanitize
 * 16.  validateRequest
 * 17.  enforceContentType
 * 18.  csrfProtection
 * 19.  morgan             — request logging
 * 20.  Routes
 * 21.  notFound
 * 22.  errorHandler
 */

const express = require('express');
const morgan  = require('morgan');
const cookieParser = require('cookie-parser');
const requestId = require('express-request-id')();

// ── Sprint 1 middleware ───────────────────────────────────────────────────
const helmetConfig      = require('./middlewares/helmetConfig');
const corsConfig        = require('./middlewares/corsConfig');
const noSqlSanitize     = require('./middlewares/noSqlSanitize');
const xssSanitize       = require('./middlewares/xssSanitize');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler      = require('./middlewares/errorHandler');
const notFound          = require('./middlewares/notFound');

// ── Sprint 2 & Enterprise middleware ──────────────────────────────────────
const {
  rejectUnknownMethods,
  enforceContentType,
  handleMalformedJson,
  hppProtection,
  validateRequestHeaders,
  validateAcceptHeader,
} = require('./middlewares/apiProtection');
const { validateRequest } = require('./middlewares/requestValidation');
const { csrfProtection }  = require('./middlewares/csrf');
const { metricsMiddleware } = require('./middlewares/metrics');

// ── Config & logger ───────────────────────────────────────────────────────
const config = require('./config');
const { logger, loggerMiddleware } = require('./utils/logger');

// ── Route imports ─────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');
const fileRoutes    = require('./routes/file.routes');
const healthRoutes  = require('./routes/health.routes');

// ── App factory ───────────────────────────────────────────────────────────
const app = express();

if (config.app.env === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmetConfig);

app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=(self)',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', ')
  );
  next();
});

app.use(corsConfig);
app.options('*', corsConfig);

// Inject Request ID
app.use(requestId);

// Inject ReqID into Logger Context
app.use(loggerMiddleware);

// Prometheus Metrics
app.use(metricsMiddleware);

app.use(rejectUnknownMethods);
app.use(validateRequestHeaders);
app.use(express.json({ limit: '10kb' }));
app.use(handleMalformedJson);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(hppProtection);
app.use(globalLimiter);
app.use(noSqlSanitize);
app.use(xssSanitize);
app.use(validateRequest);
app.use(enforceContentType);

// CSRF is skipped for health routes implicitly if needed, but handled by the csrf module normally.
app.use(csrfProtection);

const morganFormat = config.app.env === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.path.startsWith('/health') || req.path === '/metrics',
  })
);

// ── Routes ─────────────────────────────────────────────────────────────

app.use('/', healthRoutes);

app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/files',    fileRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
