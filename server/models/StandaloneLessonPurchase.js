import mongoose from 'mongoose';

// Deliberately its own entitlement record, not a repurposed Enrollment.
// Enrollment is keyed on {student, course} and is the model at the center
// of the two divergent course-checkout paths noted in CLAUDE.md — bolting a
// third purchase flow onto that model would only deepen that problem.
// Field shape mirrors Enrollment's manual-payment-proof fields (see
// models/Enrollment.js) for consistency with the rest of the platform, not
// because the two are the same resource.
const standaloneLessonPurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StandaloneLesson',
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    platformCommission: {
      type: Number,
      default: 0,
    },
    instructorShare: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    paymentAccount: String,
    paymentMethod: String,
    screenshot: String,
    invoiceId: String,
    rejectionReason: String,
  },
  { timestamps: true }
);

// One purchase per student per lesson — same double-click/race protection as
// Enrollment's index.
standaloneLessonPurchaseSchema.index({ student: 1, lesson: 1 }, { unique: true });

const StandaloneLessonPurchase = mongoose.model('StandaloneLessonPurchase', standaloneLessonPurchaseSchema);
export default StandaloneLessonPurchase;
