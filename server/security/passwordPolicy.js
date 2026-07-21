'use strict';

/**
 * @file security/passwordPolicy.js
 * Password complexity rules following OWASP ASVS v4 §2.1.
 *
 * Rules enforced:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *  - No whitespace
 *  - Evaluated by zxcvbn to reject guessable passwords (Score >= 3 required)
 */

const zxcvbn = require('zxcvbn');

const RULES = {
  minLength: { test: (p) => p.length >= 8, message: 'at least 8 characters' },
  maxLength: { test: (p) => p.length <= 128, message: 'at most 128 characters' },
  uppercase: { test: (p) => /[A-Z]/.test(p), message: 'one uppercase letter' },
  lowercase: { test: (p) => /[a-z]/.test(p), message: 'one lowercase letter' },
  digit:     { test: (p) => /\d/.test(p),    message: 'one digit' },
  special:   { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'one special character' },
  noSpaces:  { test: (p) => !/\s/.test(p),   message: 'no whitespace' },
};

/**
 * Validate a password against all policy rules and zxcvbn.
 * @param {string} password
 * @param {string[]} [userInputs] - Optional array of user info (e.g. email, name) to prevent them being used in password
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validatePasswordPolicy = (password, userInputs = []) => {
  if (typeof password !== 'string' || !password) {
    return { valid: false, errors: ['Password is required'] };
  }

  const errors = [];

  for (const [, rule] of Object.entries(RULES)) {
    if (!rule.test(password)) {
      errors.push(`Password must contain ${rule.message}`);
    }
  }

  // Enterprise zxcvbn check
  const evaluation = zxcvbn(password, userInputs);
  // Score 0-2: Weak, 3: Good, 4: Excellent
  if (evaluation.score < 3) {
    let msg = 'Password is too weak or guessable. ';
    if (evaluation.feedback.warning) {
      msg += evaluation.feedback.warning + '. ';
    }
    if (evaluation.feedback.suggestions && evaluation.feedback.suggestions.length > 0) {
      msg += evaluation.feedback.suggestions.join(' ');
    }
    errors.push(msg.trim());
  }

  return { valid: errors.length === 0, errors };
};

module.exports = { validatePasswordPolicy, RULES };
