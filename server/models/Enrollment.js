import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    // We store completed lesson IDs directly on the enrollment rather than
    // as a separate "progress" collection — for an MVP, one document per
    // student-per-course is simpler to read and simpler to reason about.
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
  },
  { timestamps: true }
);

// A student can only enroll in a given course once. This is enforced at the
// database level (not just in application code) so a race condition — e.g.
// a double-click on "Enroll" firing two requests at once — can't create two
// enrollment records for the same student+course.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
