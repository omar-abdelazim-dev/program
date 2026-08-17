import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
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
    }
  },
  { timestamps: true }
);

const Section = mongoose.model('Section', sectionSchema);

export default Section;
