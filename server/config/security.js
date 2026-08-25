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
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
]);

export const ALLOWED_VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv',
]);

export const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'text/plain',
  'application/rtf',
]);

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.zip', '.rar', '.txt', '.rtf',
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
  // File uploads: maximum 10 uploads per hour per IP to prevent disk/quota exhaustion
  uploads: { windowMs: 60 * 60 * 1000, max: 10 },
  // Global API catch-all — 200 req/15 min is generous but still protective
  global: { windowMs: 15 * 60 * 1000, max: 200 },
};

// ─── Authentication & Session Configuration ────────────────────────────────
export const AUTH_CONFIG = {
  ACCESS_TOKEN_LIFETIME: '30m',
  REFRESH_TOKEN_LIFETIME: '7d',
  
  MAX_LOGIN_ATTEMPTS_STAGE_1: 5,
  LOCK_DURATION_STAGE_1: 1 * 60 * 1000, // 1 minute
  
  MAX_LOGIN_ATTEMPTS_STAGE_2: 3,
  LOCK_DURATION_STAGE_2: 3 * 60 * 1000, // 3 minutes
  
  LOCK_DURATION_ESCALATED: 5 * 60 * 1000, // 5 minutes
  
  MAX_ACTIVE_SESSIONS: 2,
  
  EMAIL_TOKEN_EXPIRATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_EXPIRATION: 30 * 60 * 1000, // 30 minutes
  SESSION_IDLE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
};
