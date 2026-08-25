import mongoose from 'mongoose';

const modulePurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
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

modulePurchaseSchema.index({ student: 1, module: 1 }, { unique: true });

const ModulePurchase = mongoose.model('ModulePurchase', modulePurchaseSchema);
export default ModulePurchase;
