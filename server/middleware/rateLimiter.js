import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/security.js';

// Common response shape used across the entire API
const rateLimitMessage = { message: 'Too many attempts. Please try again later.' };

// ─── Existing limiter (preserved for backward compatibility) ─────────────────
// Throttles the public auth endpoints (register/login/check-email) so they
// can't be brute-forced or credential-stuffed. Keyed by IP, matches the
// `{ message }` error shape the rest of the API uses.
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  limit: RATE_LIMITS.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// ─── Granular limiters (Sprint 1 additions) ──────────────────────────────────

// Login: tighter than the general auth limiter — 5 attempts / 15 min.
// Prevents credential stuffing and brute-force attacks on the login form.
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS.login.windowMs,
  limit: RATE_LIMITS.login.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Register: very restrictive — 3 registrations / hour per IP.
// Limits automated account creation and scraping.
export const registerLimiter = rateLimit({
  windowMs: RATE_LIMITS.register.windowMs,
  limit: RATE_LIMITS.register.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Forgot password: prevents email enumeration via rate pressure.
export const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMITS.forgotPassword.windowMs,
  limit: RATE_LIMITS.forgotPassword.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// OTP: prevents SMS/email OTP brute-force.
export const otpLimiter = rateLimit({
  windowMs: RATE_LIMITS.otp.windowMs,
  limit: RATE_LIMITS.otp.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// Global API limiter — applied to all routes as a catch-all backstop.
// Set to 200/15min which is generous for legitimate usage but still provides
// some protection against scrapers and accidental DOS scenarios.
export const globalApiLimiter = rateLimit({
  windowMs: RATE_LIMITS.global.windowMs,
  limit: RATE_LIMITS.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  // Skip rate limiting for health checks — monitoring tools poll frequently
  skip: (req) => req.path === '/api/health',
});

