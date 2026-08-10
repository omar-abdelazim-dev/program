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
    // INS-03: de-required in favor of College-based tagging — kept (rather
    // than dropped) so existing courses and category-based analytics/filters
    // don't break; new courses are no longer required to set it.
    category: {
      type: String,
      trim: true,
      default: '',
    },
    // Optional curriculum tagging so the personalized Home page can group
    // this course under "{major} - Semester {semester}". Left unset for
    // courses that aren't part of a specific major's curriculum.
    major: {
      type: String,
      default: '',
    },
    semester: {
      type: Number,
    },
    // College the course is tagged under (INS-03) — replaces major/category
    // as the primary way students filter and discover courses (STU-06).
    college: {
      type: String,
      default: '',
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
    // unpublished -> admin pulled a previously-approved course from the catalog
    // suspended -> admin suspended the course, removing it from catalog and notifying instructor
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'unpublished', 'suspended', 'draft'],
      default: 'pending',
    },
    // Feedback shown to the instructor when an admin rejects the course.
    // Cleared out if the course is later approved.
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    // Instructors can no longer delete a course outright — they request
    // deletion, and an admin reviews the request before the course (and its
    // enrollment history) is actually removed.
    deletionRequested: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;
