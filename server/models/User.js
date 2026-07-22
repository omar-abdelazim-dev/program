import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../config/security.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8, // Applies to new passwords; existing hashes are unaffected.
      select: false, // Never return password field by default on queries.
    },
    // Set whenever a password is changed — useful for audit trails and
    // invalidating sessions that were issued before the password was rotated.
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin', 'superadmin'],
      default: 'student',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // Soft-delete flag — deleted users are hidden from admin lists by default
    // but the record (and any FK references from Enrollment/Course) is preserved.
    isDeleted: {
      type: Boolean,
      default: false,
    },
    university: { type: String, default: '' },
    college: { type: String, default: '' },
    year: { type: String, default: '' },
    track: { type: String, default: '' },
    providedCourses: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    socialUrl: { type: String, default: '' },
    goalsText: { type: String, default: '' },
    selectedPills: { type: [String], default: [] },
    // ─── Sprint 2: Account Lockout ───────────────────────────────────────────
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // ─── Sprint 2: Email Verification ────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false, // stored as SHA-256 hash
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    // ─── Sprint 2: Active Session Tracking ───────────────────────────────────
    activeSessions: {
      type: [
        {
          sessionId: String,
          refreshTokenHash: String,
          issuedAt: Date,
          expiresAt: Date,
          device: String,
          browser: String,
          operatingSystem: String,
          ipAddress: String,
          revoked: { type: Boolean, default: false },
        },
      ],
      default: [],
      select: false, // Keep sessions out of generic user queries
    },
  },
  { timestamps: true }
);

// Runs automatically before a user document is saved.
// We hash the password here (not in the controller) so it's IMPOSSIBLE to
// accidentally save a plaintext password no matter where in the app you call
// User.save() from — the safety lives with the model, not the caller.
userSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually changed
  // (otherwise updating a user's name would re-hash their already-hashed password).
  if (!this.isModified('password')) return next();

  // BCRYPT_ROUNDS = 12 (per OWASP recommendation, ≥ 12 for bcrypt).
  // Cost 12 adds ~250 ms per hash on a modern CPU — acceptable for auth,
  // practically impractical for offline brute-force attacks.
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);

  // Record the time of the password change for audit purposes
  this.passwordChangedAt = new Date();

  next();
});

// Instance method: compare a plaintext password (from login form) against
// the hashed password stored in the DB. Returns true/false.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: check if account is currently locked out
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.model('User', userSchema);

export default User;
