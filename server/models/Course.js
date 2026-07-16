import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
      // MVP scope: this is a display-only number. No payment processing —
      // see project scope boundaries. Do not wire this to Stripe without
      // being explicitly asked.
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The whole approval workflow hinges on this one field:
    // pending -> instructor just submitted, not visible to students yet
    // approved -> admin approved, shows up in the public catalog
    // rejected -> admin rejected, instructor can see feedback and resubmit later
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Feedback shown to the instructor when an admin rejects the course.
    // Cleared out if the course is later approved.
    rejectionReason: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;
