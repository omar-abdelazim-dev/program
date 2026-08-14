import mongoose from 'mongoose';

const emailOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Optional now because pre_register_verification happens before user creation
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ['password_reset', 'register_verification', 'password_change', 'pre_register_verification'],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete document when expiresAt is reached
    },
    usedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Holds staged data (e.g. hashed new password)
      default: {},
    },
  },
  { timestamps: true }
);

// One active OTP per user per purpose (a new request replaces the old one) for existing users
emailOtpSchema.index({ userId: 1, purpose: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });

// For pre-registration, we only have the email, so we scope a unique index to that purpose where userId is null
emailOtpSchema.index(
  { email: 1, purpose: 1 },
  { unique: true, partialFilterExpression: { purpose: 'pre_register_verification' } }
);

const EmailOTP = mongoose.model('EmailOTP', emailOtpSchema);
export default EmailOTP;
