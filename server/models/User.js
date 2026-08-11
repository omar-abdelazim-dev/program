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
    lastName: {
      type: String,
      trim: true,
      default: '',
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
    isBlocked: { type: Boolean, default: false },
    isProgramInstructor: { type: Boolean, default: false },
    // Forgot-password flow (ADM-08): a single hashed token + expiry per user —
    // requesting a new one overwrites the old one, which is what "invalidate
    // any previous unexpired token" means in practice (only the newest ever
    // matches what resetPassword hashes and compares against).
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    // Payout 2FA (INS-09): short-lived OTP hash, verified at payout-request time.
    payoutOtpHash: { type: String, select: false },
    payoutOtpExpires: { type: Date, select: false },
    // Soft-delete flag — deleted users are hidden from admin lists by default
    // but the record (and any FK references from Enrollment/Course) is preserved.
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Student's field of study, set at registration and editable in Settings.
    // Drives the personalized Home page's semester sections.
    major: { type: String, default: '' },
    university: { type: String, default: '' },
    college: { type: String, default: '' },
    year: { type: String, default: '' },
    track: { type: String, default: '' },
    providedCourses: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    socialUrl: { type: String, default: '' },
    goalsText: { type: String, default: '' },
    selectedPills: { type: [String], default: [] },
    
    // --- Account Lockout Fields ---
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutStage: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // --- Email Verification Fields ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Virtual for checking if the account is currently locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});


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

const User = mongoose.model('User', userSchema);

export default User;

