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
      enum: ['pending', 'cleared', 'rejected'],
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
      // Only applicable if type === 'payout_request'. bank_transfer was
      // removed (INS-09) — only mobile-wallet-style methods are supported.
      enum: ['vodafone_cash', 'instapay'],
    },
    payoutDetails: {
      type: String,
      // Used for things like Vodafone Cash phone numbers
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
