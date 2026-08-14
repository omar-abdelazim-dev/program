import { PASSWORD_POLICY } from '../config/security.js';

/**
 * Shared password validator function used across:
 * - Registration
 * - Forced password reset (lockout)
 * - Voluntary password change
 */
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    return `Password must be at least ${PASSWORD_POLICY.minLength} characters`;
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null; // Valid
};
