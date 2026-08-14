import crypto from 'crypto';

// ── Config (all env-configurable) ────────────────────────────────────────────
const OTP_SECRET          = process.env.OTP_SECRET || 'change_me_in_production';
const OTP_EXPIRY_MINUTES  = parseInt(process.env.OTP_EXPIRY_MINUTES  || '10', 10);
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const MAX_ATTEMPTS        = 5;

// ── OTP Generation ────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP using crypto.randomInt (CSPRNG, never Math.random).
 * Returns the raw code string.
 */
export function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000); // [0, 999999]
  return String(code).padStart(6, '0');
}

// ── HMAC Hashing ──────────────────────────────────────────────────────────────

/**
 * Return an HMAC-SHA256 hex digest of `code` using OTP_SECRET.
 * We never store the raw code — only this hash.
 */
export function hashOtp(code) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(String(code))
    .digest('hex');
}

/**
 * Timing-safe comparison of a candidate OTP against a stored hash.
 * Prevents timing-based oracle attacks.
 *
 * @param {string} candidateCode  - The OTP the user submitted (raw 6-digit string).
 * @param {string} storedHash     - The HMAC-SHA256 hex stored in DB.
 * @returns {boolean}
 */
export function verifyOtp(candidateCode, storedHash) {
  const candidateHash = hashOtp(candidateCode);
  // Both must be the same byte-length for timingSafeEqual to work.
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash,    'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Expiry / Cooldown helpers ─────────────────────────────────────────────────

/** Returns the Date when a freshly-created OTP expires. */
export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/** Returns the Date after which a new OTP can be requested for the same payout. */
export function resendCooldownEnd() {
  return new Date(Date.now() + RESEND_COOLDOWN_SEC * 1000);
}

export { MAX_ATTEMPTS, OTP_EXPIRY_MINUTES, RESEND_COOLDOWN_SEC };

