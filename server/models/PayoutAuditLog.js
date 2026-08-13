import mongoose from 'mongoose';

// ── PayoutAuditLog ────────────────────────────────────────────────────────────
// Immutable audit trail — one document per state transition / significant event.
// Never update or delete these records.
const payoutAuditLogSchema = new mongoose.Schema(
  {
    payoutRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'otp_requested',
        'otp_resent',
        'otp_failed_attempt',
        'otp_max_attempts_exceeded',
        'otp_verified',
        'payout_submitted',
        'payout_approved',
        'payout_executed',
        'payout_completed',
        'payout_failed',
        'payout_rejected',
        'email_mismatch_flagged',
      ],
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    // Arbitrary structured metadata (attempt numbers, email, amount, reason…)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const PayoutAuditLog = mongoose.model('PayoutAuditLog', payoutAuditLogSchema);
export default PayoutAuditLog;
