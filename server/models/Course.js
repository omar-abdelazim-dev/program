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
      // Paid access uses the manual transfer-proof review flow. There is no
      // card processor or automated gateway settlement.
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
    // draft -> admin approved but instructor hasn't published it live yet
    //          (courseType: 'full' only — see publishCourse). Also the
    //          state an 'ongoing' course falls back to after 14 days of
    //          inactivity (see the ongoing-inactivity scheduled job).
    // approved -> live, shows up in the public catalog
    // rejected -> admin rejected, instructor can see feedback and resubmit later
    // unpublished -> admin pulled a previously-approved course from the catalog
    // suspended -> admin suspended the course, removing it from catalog and notifying instructor
    // archived -> courseType:'ongoing' only; auto-set by the 90-day draft
    // expiration job (see jobs/courseLifecycleJobs.js). Not a hard delete —
    // Course/Module/Lesson documents (and all financial/enrollment records,
    // which were never touched by course deletion anyway) are preserved.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'unpublished', 'suspended', 'draft', 'archived'],
      default: 'pending',
    },
    // Left unset on every course that existed before this field was added —
    // deliberately not backfilled (see CLAUDE.md's course-type migration
    // note). A course with no courseType is exempt from all full/ongoing
    // rules (content lock, inactivity timer, price-approval): it behaves
    // exactly as it did before this feature shipped.
    courseType: {
      type: String,
      enum: ['full', 'ongoing'],
    },
    // 'ongoing' courses only: when the instructor last published new
    // content (a lesson transitioning to status:'published'). Drives the
    // 14-day inactivity job. Editing/uploading-as-draft never touches this.
    lastPublishedContentAt: {
      type: Date,
    },
    // 'ongoing' courses only: when the course most recently entered
    // status:'draft' due to inactivity. Drives the 90-day expiration job.
    draftStartedAt: {
      type: Date,
    },
    // 'ongoing' courses only: timestamps of the day-10/day-12 inactivity
    // warnings already sent for the *current* activity cycle, so the job
    // doesn't re-notify on every run. Cleared whenever new content is
    // published or the course re-enters status:'draft'.
    inactivityWarningSentAt: {
      type: Date,
    },
    inactivityUrgentWarningSentAt: {
      type: Date,
    },
    // 'ongoing' courses only: set when the day-80 "approaching deletion"
    // warning is sent for the current draft period, ahead of the 90-day
    // archive job. Cleared whenever the course leaves status:'draft'.
    draftExpirationWarningSentAt: {
      type: Date,
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
    // courseType:'full' only (spec §5). `price` itself never changes until
    // an admin approves — see courseController.approvePriceChange. Cleared
    // back to undefined after every approve/reject so a new request can
    // always be submitted; the approve/reject audit trail lives in
    // AuditLog (see utils/auditLogger.js), not here.
    pendingPriceChange: {
      requestedPrice: { type: Number, min: 0 },
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      requestedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;
