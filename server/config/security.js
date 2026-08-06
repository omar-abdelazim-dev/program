/**
 * Central security constants.
 * All security-related configuration lives here so it can be imported
 * by any middleware without being duplicated across the codebase.
 */

// ─── Bcrypt ────────────────────────────────────────────────────────────────
// Cost factor ≥ 12 per OWASP recommendation.
// At 12 rounds, bcrypt takes ~250 ms per hash on a modern server —
// fast enough for UX, slow enough to make offline brute-force attacks impractical.
export const BCRYPT_ROUNDS = 12;

// ─── Password Policy ───────────────────────────────────────────────────────
export const PASSWORD_POLICY = {
  minLength: 8,
  // At least one uppercase, one lowercase, one digit, one special character.
  // Using individual checks gives clearer error messages than one regex.
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~\\',
};

// ─── Allowed upload MIME types ─────────────────────────────────────────────
export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

export const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo', // avi
  'video/x-matroska', // mkv
]);

// ─── Allowed upload extensions ─────────────────────────────────────────────
export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
]);

export const ALLOWED_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv',
]);

// ─── CORS ──────────────────────────────────────────────────────────────────
// Parse comma-separated CLIENT_URL env var into an array of allowed origins.
// Example: CLIENT_URL=http://localhost:5173,https://app.example.com
export const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
};

// ─── Rate limiter windows ───────────────────────────────────────────────────
export const RATE_LIMITS = {
  // Login: tight — 5 attempts per 15 minutes to prevent brute-force
  login: { windowMs: 15 * 60 * 1000, max: 5 },
  // Register: very tight — 3 registrations per hour per IP
  register: { windowMs: 60 * 60 * 1000, max: 3 },
  // Forgot password / OTP: 3 per hour per IP
  forgotPassword: { windowMs: 60 * 60 * 1000, max: 3 },
  otp: { windowMs: 15 * 60 * 1000, max: 5 },
  // General auth endpoints (check-email, change-password)
  auth: { windowMs: 15 * 60 * 1000, max: 10 },
  // Global API catch-all — 200 req/15 min is generous but still protective
  global: { windowMs: 15 * 60 * 1000, max: 200 },
};
