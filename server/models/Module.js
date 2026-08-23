import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    order: {
      type: Number,
      required: true
    },
    estimatedDuration: {
      type: Number,
      default: 0
    }, // in minutes
    status: {
      type: String,
      enum: ['draft', 'published', 'hidden', 'archived'],
      default: 'draft',
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const Module = mongoose.model('Module', moduleSchema);

export default Module;
