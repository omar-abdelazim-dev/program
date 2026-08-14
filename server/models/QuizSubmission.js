import mongoose from 'mongoose';

// One document per student per quiz lesson. Multiple-choice answers are
// graded synchronously on submit; written answers sit at `pending_review`
// until an instructor grades them (see quizController.gradeSubmission).
// The student can resubmit/edit answers while still pending_review; once
// graded, the submission is locked (enforced in the controller, not here).
const quizSubmissionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [
      {
        questionIndex: { type: Number, required: true },
        // mcq
        selectedOptionIndex: { type: Number },
        isCorrect: { type: Boolean },
        // written
        textAnswer: { type: String, trim: true },
        pointsAwarded: { type: Number },
        feedback: { type: String, default: '', trim: true },
      },
    ],
    autoScore: { type: Number, default: 0 }, // sum of points from auto-graded (mcq) answers
    maxScore: { type: Number, default: 0 }, // sum of points across all questions
    status: {
      type: String,
      enum: ['pending_review', 'graded'],
      default: 'pending_review',
    },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ student: 1, lesson: 1 }, { unique: true });

const QuizSubmission = mongoose.model('QuizSubmission', quizSubmissionSchema);

export default QuizSubmission;
