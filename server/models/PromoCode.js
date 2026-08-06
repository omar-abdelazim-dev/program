import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    // The (non-program) instructor this affiliate code is tied to — using it
    // at enrollment gives that instructor the same fixed 85/15 split a
    // program instructor gets, regardless of the admin-configured commission.
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
export default PromoCode;
