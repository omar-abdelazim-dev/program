import mongoose from 'mongoose';

// A standalone lesson (spec §11): purchasable independently of any course,
// loosely tied to one of the instructor's Full Courses for discovery
// ("Related to: X") but never inserted into that course's modules and never
// modifying it. Deliberately its own model rather than a Lesson with no
// `module` — Lesson is tightly coupled to the Module/Course hierarchy
// (progress tracking, content-lock, module-scoped ordering), none of which
// applies here.
const standaloneLessonSchema = new mongoose.Schema(
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
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Generic by design (spec §11: "do not hardcode this feature specifically
    // for Linear Algebra") — must be one of this instructor's own courses,
    // enforced in the controller, not restricted to any particular subject.
    // Required to be courseType:'full' at creation time; not re-validated if
    // the related course's type later changes.
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    // Same shape as Course.status (minus 'draft'/'archived', which don't
    // apply to a single purchasable item) — every standalone lesson goes
    // through the same admin review everything else on this platform does.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const StandaloneLesson = mongoose.model('StandaloneLesson', standaloneLessonSchema);
export default StandaloneLesson;
