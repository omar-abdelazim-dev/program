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
      required: [function () { return this.lessonType !== 'quiz'; }, 'Video URL is required'],
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
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    // Determines playback order within a module. We set this automatically
    // based on how many lessons already exist in the module (see
    // lessonController.js) so instructors don't have to manually number anything.
    order: {
      type: Number,
      required: true,
    },
    lessonType: {
      type: String,
      enum: ['video', 'reading', 'quiz', 'assignment', 'live'],
      default: 'video',
    },
    // Only populated when lessonType === 'quiz'. Each question is either a
    // multiple-choice question (graded automatically on submit) or a
    // written/free-text question (queued for manual instructor grading —
    // see QuizSubmission).
    quiz: {
      questions: [
        {
          type: {
            type: String,
            enum: ['mcq', 'written'],
            required: true,
          },
          prompt: {
            type: String,
            required: true,
            trim: true,
          },
          options: {
            type: [String], // mcq only — instructor UI enforces 4-6, also re-validated server-side
            default: undefined,
          },
          correctOptionIndex: {
            type: Number, // mcq only — index into `options`
          },
          points: {
            type: Number,
            default: 1,
            min: 0,
          },
        },
      ],
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
