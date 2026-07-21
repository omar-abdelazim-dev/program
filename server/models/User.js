'use strict';

/**
 * @file models/User.js
 * Mongoose User model.
 *
 * Security features:
 *  - Password is NEVER returned in queries (select: false)
 *  - Email is normalised to lowercase
 *  - Roles are restricted to an enum
 *  - Email verification and password reset tokens stored as hashed values
 *  - Account lockout counter for brute-force mitigation
 */

const mongoose = require('mongoose');

const ROLES = ['student', 'instructor', 'admin', 'superadmin'];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'],
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // NEVER returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Invalid role: {VALUE}' },
      default: 'student',
    },

    // ── Email verification ────────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // ── Password reset ────────────────────────────────────────────────────
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // ── Account lockout (brute-force mitigation) ──────────────────────────
    failedLoginAttempts: { type: Number, default: 0, select: false },
    accountLockedUntil: { type: Date, default: null, select: false },

    // ── Instructor-specific ───────────────────────────────────────────────
    isApproved: { type: Boolean, default: false },

    // ── Soft delete ───────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },

    // ── Sprint 2: Session security ─────────────────────────────────────────
    // Used to invalidate all refresh tokens issued before a password change.
    // Any token with iat < passwordChangedAt is considered expired.
    passwordChangedAt: { type: Date, default: null, select: false },

    // Last login metadata for monitoring
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Strip internal fields from API responses
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.failedLoginAttempts;
        delete ret.accountLockedUntil;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ── Virtual: full name ─────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Instance method: check if account is locked ───────────────────────────
userSchema.methods.isLocked = function () {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
