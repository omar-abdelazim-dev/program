import rateLimit from 'express-rate-limit';

// Throttles the public auth endpoints (register/login/check-email) so they
// can't be brute-forced or credential-stuffed. Keyed by IP, matches the
// `{ message }` error shape the rest of the API uses.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});
