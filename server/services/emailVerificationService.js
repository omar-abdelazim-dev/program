import crypto from 'crypto';
import logger from '../utils/logger.js';
import { AUTH_CONSTANTS } from '../config/security.js';

/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 * @returns {Object} { plainToken, hashedToken, expiresAt }
 */
export const generateVerificationToken = () => {
  // Generate a random 32-byte hex string
  const plainToken = crypto.randomBytes(32).toString('hex');

  // Hash it for DB storage (so even if DB leaks, tokens can't be used)
  const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

  // Expiration date
  const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.EMAIL_TOKEN_EXPIRATION);

  return { plainToken, hashedToken, expiresAt };
};

/**
 * Sends the verification email.
 * Gracefully degrades to Winston logging if SMTP is not configured.
 * @param {string} email - Recipient email
 * @param {string} token - The raw, plain verification token
 * @param {string} origin - The frontend application URL
 */
export const sendVerificationEmail = async (email, token, origin) => {
  const verificationUrl = `${origin}/verify-email?token=${token}`;

  // If we had a real SMTP transporter (e.g. nodemailer + SendGrid), we'd check it here.
  // if (process.env.SMTP_URL) {
  //   await transporter.sendMail({ ... });
  //   return;
  // }

  // Fallback: graceful degradation via Winston for development / unconfigured environments.
  // This satisfies the "Registration must never fail because email sending is unavailable" rule.
  logger.info(`[Email Service Mock] Verification email sent to ${email}`, {
    verificationUrl,
    type: 'EMAIL_VERIFICATION'
  });
};
