'use strict';

/**
 * @file utils/logger.js
 * Winston logger — Enterprise Grade.
 *
 * Security events, login/logout, and admin actions are logged via
 * the `security` child logger that adds { category: 'security' }.
 */

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'warn' : 'debug');
const LOG_DIR = path.resolve(process.cwd(), 'logs');

// ── AsyncLocalStorage for Correlation IDs ──────────────────────────────────
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Express middleware to initialize context with req.id
 */
const loggerMiddleware = (req, res, next) => {
  asyncLocalStorage.run({ reqId: req.id }, () => next());
};

// ── Custom formats ─────────────────────────────────────────────────────────

const injectReqId = format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store && store.reqId) {
    info.reqId = store.reqId;
  }
  return info;
});

const baseFormat = format.combine(
  injectReqId(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
);

const jsonFormat = format.combine(baseFormat, format.json());

const devFormat = format.combine(
  baseFormat,
  format.colorize(),
  format.printf(({ timestamp, level, message, reqId, ...meta }) => {
    const idStr = reqId ? ` [ReqID: ${reqId}]` : '';
    const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}]${idStr}: ${message}${extras}`;
  })
);

// ── Daily rotate transport factory ─────────────────────────────────────────

const rotateTransport = (filename, level) =>
  new transports.DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${filename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    level,
    format: jsonFormat,
    zippedArchive: true,
  });

// ── Root logger ────────────────────────────────────────────────────────────

const logger = createLogger({
  level: LOG_LEVEL,
  transports: [
    new transports.Console({
      format: NODE_ENV === 'production' ? jsonFormat : devFormat,
    }),
    rotateTransport('combined', 'debug'),
    rotateTransport('error', 'error'),
  ],
  exitOnError: false,
});

// ── Security child logger ──────────────────────────────────────────────────

const securityLogger = logger.child({ category: 'security' });

securityLogger.loginSuccess = (userId, ip, ua) =>
  securityLogger.info('LOGIN_SUCCESS', { userId, ip, userAgent: ua });

securityLogger.loginFailed = (identifier, ip, reason) =>
  securityLogger.warn('LOGIN_FAILED', { identifier, ip, reason });

securityLogger.logout = (userId, ip) =>
  securityLogger.info('LOGOUT', { userId, ip });

securityLogger.passwordReset = (userId, ip) =>
  securityLogger.info('PASSWORD_RESET', { userId, ip });

securityLogger.adminAction = (adminId, action, target) =>
  securityLogger.info('ADMIN_ACTION', { adminId, action, target });

securityLogger.securityEvent = (event, details) =>
  securityLogger.warn('SECURITY_EVENT', { event, ...details });

module.exports = { logger, securityLogger, loggerMiddleware };
