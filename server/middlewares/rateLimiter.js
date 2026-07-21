'use strict';

/**
 * @file middlewares/rateLimiter.js
 * Enterprise rate limits using Redis to synchronize counters across
 * horizontally scaled node instances.
 *
 * Limits (per IP unless otherwise noted):
 *  loginLimiter        — 10 attempts / 15 min
 *  registerLimiter     — 5 registrations / hour
 *  forgotPasswordLimiter — 5 requests / hour
 *  otpLimiter          — 5 OTP requests / 10 min
 *  globalLimiter       — 300 requests / 15 min (all routes)
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const redisClient = require('../config/redis');
const ApiError = require('../utils/ApiError');

// ── Standard handler for all limiters ────────────────────────────────────
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

// ── Skip function: bypass limiter for trusted IPs (e.g. health checks) ───
const skipIfTrusted = (req) => {
  const trusted = (process.env.TRUSTED_IPS || '').split(',').map((ip) => ip.trim());
  return trusted.includes(req.ip);
};

// ── Redis Store Factory ──────────────────────────────────────────────────
const createRedisStore = (prefix) => {
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rate_limit:${prefix}:`,
  });
};

// ── Login ─────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  store: createRedisStore('login'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts. Account temporarily locked.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipIfTrusted,
  keyGenerator: (req) => `login:${req.ip}:${req.body?.email || ''}`,
});

// ── Register ──────────────────────────────────────────────────────────────
const registerLimiter = rateLimit({
  store: createRedisStore('register'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipIfTrusted,
});

// ── Forgot Password ───────────────────────────────────────────────────────
const forgotPasswordLimiter = rateLimit({
  store: createRedisStore('forgotPassword'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipIfTrusted,
  keyGenerator: (req) => `forgot:${req.ip}:${req.body?.email || ''}`,
});

// ── OTP / Email Verification ──────────────────────────────────────────────
const otpLimiter = rateLimit({
  store: createRedisStore('otp'),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: 'Too many OTP requests. Please wait before requesting another.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipIfTrusted,
});

// ── Global API ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  store: createRedisStore('global'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: 'Too many requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipIfTrusted,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
  globalLimiter,
};
