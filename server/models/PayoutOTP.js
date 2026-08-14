import mongoose from 'mongoose';

// ── PayoutOTP ─────────────────────────────────────────────────────────────────
// One active OTP record per payout request (unique index on payoutRequestId).
// A new OTP request replaces the previous document (upsert pattern).
const payoutOtpSchema = new mongoose.Schema(
  {
    payoutRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true, // enforces one-active-OTP-per-payout
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // HMAC-SHA256 of the raw OTP — raw code is NEVER persisted.
    otpHash: {
      type: String,
      required: true,
      select: false, // never returned in default queries
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
    },
    // When a new OTP is requested before the cooldown ends we block the request.
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    // Set when successfully verified (idempotency guard).
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index: MongoDB auto-deletes expired OTP records (keeps collection clean).
payoutOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PayoutOTP = mongoose.model('PayoutOTP', payoutOtpSchema);
export default PayoutOTP;
