import mongoose from 'mongoose';

// Records a single "abandoned Ongoing Course" event — created automatically
// by the 14-day inactivity job (see jobs/courseLifecycleJobs.js), never by
// an admin directly. `stage` is a computed severity based on the
// instructor's running count of these at the time this record was created;
// it is informational only. Actually suspending an instructor is a separate
// admin action (User.isBlocked, already existing) — this model never
// changes that field itself, matching spec §10: "Admins should make the
// final decision on serious penalties."
const instructorViolationSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    type: {
      type: String,
      enum: ['ongoing_inactivity'],
      default: 'ongoing_inactivity',
    },
    stage: {
      type: String,
      enum: ['warning', 'admin_review', 'final_warning'],
      required: true,
    },
    // Set by an admin after reviewing this violation in the admin UI.
    adminNotes: {
      type: String,
      default: '',
    },
    acknowledgedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

instructorViolationSchema.index({ instructor: 1, createdAt: -1 });

const InstructorViolation = mongoose.model('InstructorViolation', instructorViolationSchema);
export default InstructorViolation;
