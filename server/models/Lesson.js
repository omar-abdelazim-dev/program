import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    attachmentUrl: {
      type: String,
      default: '',
    },
    attachmentTitle: {
      type: String,
      default: '',
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    // Determines playback order within a course. We set this automatically
    // based on how many lessons already exist (see lessonController.js) so
    // instructors don't have to manually number anything.
    order: {
      type: Number,
      required: true,
    },
    lessonType: {
      type: String,
      enum: ['video', 'reading', 'quiz', 'assignment', 'live'],
      default: 'video',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'hidden', 'archived', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number, // 0-100 percentage
      default: 0,
    },
  },
  { timestamps: true }
);

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;
