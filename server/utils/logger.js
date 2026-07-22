/**
 * Winston logger — structured application and security logging.
 *
 * Three outputs:
 *   combined.log  — all log levels (info, warn, error, security events)
 *   error.log     — only errors (easier to grep in prod)
 *   security.log  — security-specific events (auth failures, injection attempts, etc.)
 *
 * Console output is human-readable in development, silent in production
 * (log files are used instead so structured JSON isn't cluttering stdout).
 *
 * IMPORTANT: This logger is for NEW security-related code only.
 * Existing console.error() calls in legacy controllers are NOT replaced —
 * that would be a mass refactor outside Sprint 1 scope.
 */

import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logs directory: server/logs/
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Shared format: timestamp + structured JSON in production, pretty in dev
const isProd = process.env.NODE_ENV === 'production';

const sharedFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }), // Include stack traces in log files (never in HTTP responses)
  isProd ? format.json() : format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// ─── Main application logger ────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: sharedFormat,
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20 MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

// Add console transport in development for convenience
if (!isProd) {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 0)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

// ─── Security-specific logger ───────────────────────────────────────────────
// Separate file so security events can be shipped to a SIEM without
// mixing in routine application logs.
export const securityLogger = createLogger({
  level: 'info',
  format: sharedFormat,
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'security.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

if (!isProd) {
  securityLogger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 0)}` : '';
        return `[${timestamp}] 🔐 SECURITY ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

export default logger;
