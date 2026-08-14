import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      // Positive for sales, negative for payouts
    },
    type: {
      type: String,
      enum: ['course_sale', 'payout_request'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'otp_verified', 'approved', 'processing', 'paid', 'cleared', 'failed', 'rejected'],
      default: 'pending',
    },
    description: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      // Only applicable if type === 'course_sale'
    },
    // Platform commission percent actually applied to this sale — records
    // whether the admin-configured rate, the program-instructor fixed rate,
    // or a promo-code override (ADM-13) was used, since that isn't otherwise
    // recoverable after the admin-configured rate later changes.
    commissionRate: {
      type: Number,
      // Only applicable if type === 'course_sale'
    },
    payoutMethod: {
      type: String,
      enum: ['vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_cash', 'instapay'],
    },
    payoutDetails: {
      type: String,
      // Used for things like Vodafone Cash phone numbers
    },
    payoutEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    requiresSecondApproval: {
      type: Boolean,
      default: false,
    },
    otpVerifiedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Only enforce uniqueness when field is present (so course sales aren't affected)
    },
    executionAttemptedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      default: '',
    },
    expectedFees: {
      type: Number,
    },
    expectedPayout: {
      type: Number,
    },
    actualFee: {
      type: Number,
    },
    actualPayout: {
      type: Number,
    },
    providerTransactionId: {
      type: String,
    },
    referenceId: {
      type: String,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    availableAt: {
      type: Date,
      // Only applicable for 'course_sale' to enforce the 14-day settlement
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
