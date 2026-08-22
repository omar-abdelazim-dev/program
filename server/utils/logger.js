/**
 * Winston logger — structured application and security logging.
 *
 * Production output is JSON on stdout so the hosting platform can collect,
 * retain, search, and alert on it. Development output stays human-readable.
 *
 * IMPORTANT: This logger is for NEW security-related code only.
 * Existing console.error() calls in legacy controllers are NOT replaced —
 * that would be a mass refactor outside Sprint 1 scope.
 */

import { createLogger, format, transports } from 'winston';
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
  transports: isProd ? [new transports.Console()] : [],
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
// The explicit stream property lets a log collector route these events to a
// SIEM without relying on an ephemeral container filesystem.
export const securityLogger = createLogger({
  level: 'info',
  format: sharedFormat,
  defaultMeta: { stream: 'security' },
  transports: isProd ? [new transports.Console()] : [],
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
