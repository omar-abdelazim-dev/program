import Course from '../models/Course.js';
import Notification from '../models/Notification.js';
import InstructorViolation from '../models/InstructorViolation.js';
import logger from '../utils/logger.js';

// Progressive discipline (spec §10) — never auto-suspends. Suspension stays
// a manual admin action via the existing User.isBlocked toggle; this only
// escalates what an admin sees when they go look.
const violationStageForCount = (count) => {
  if (count <= 1) return 'warning';
  if (count === 2) return 'admin_review';
  return 'final_warning';
};

const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVITY_DRAFT_DAYS = 14;
const INACTIVITY_URGENT_WARNING_DAYS = 12;
const INACTIVITY_WARNING_DAYS = 10;
const DRAFT_EXPIRATION_DAYS = 90;
const DRAFT_EXPIRATION_WARNING_DAYS = 80;

// Every mutation here is a single atomic findOneAndUpdate whose filter
// re-checks the exact precondition, not a find-then-save — so running this
// twice (or two instances running it concurrently) is a no-op the second
// time: whichever call loses the race matches zero documents and moves on.

// Day 14: no qualifying published content -> ACTIVE_ONGOING becomes DRAFT.
// Processed before the day-12/day-10 warning sweeps so a course that just
// crossed 14 days doesn't also get an urgent-warning notification in the
// same run.
const runInactivityDraftTransition = async () => {
  const cutoff = new Date(Date.now() - INACTIVITY_DRAFT_DAYS * DAY_MS);
  const candidates = await Course.find({
    courseType: 'ongoing',
    status: 'approved',
    lastPublishedContentAt: { $lte: cutoff },
  }).select('_id instructor title');

  let count = 0;
  for (const candidate of candidates) {
    const course = await Course.findOneAndUpdate(
      { _id: candidate._id, courseType: 'ongoing', status: 'approved', lastPublishedContentAt: { $lte: cutoff } },
      { status: 'draft', draftStartedAt: new Date(), inactivityWarningSentAt: null, inactivityUrgentWarningSentAt: null, draftExpirationWarningSentAt: null },
      { new: true }
    );
    if (!course) continue; // already handled by a concurrent/earlier run
    count += 1;

    const violationCount = await InstructorViolation.countDocuments({ instructor: course.instructor, type: 'ongoing_inactivity' }) + 1;
    const stage = violationStageForCount(violationCount);
    await InstructorViolation.create({ instructor: course.instructor, course: course._id, type: 'ongoing_inactivity', stage });

    const escalationNote = stage === 'admin_review'
      ? ' This is the 2nd time one of your ongoing courses has gone inactive — it has been flagged for admin review.'
      : stage === 'final_warning'
        ? ' This is a repeated pattern across your ongoing courses and has been flagged as a final warning.'
        : '';
    await Notification.create({
      user: course.instructor,
      title: 'Course Moved to Draft — Inactivity',
      message: `Your ongoing course "${course.title}" has been moved to Draft because no new lesson was published for ${INACTIVITY_DRAFT_DAYS} days. Publish a new lesson to reactivate it, or it will be automatically archived after ${DRAFT_EXPIRATION_DAYS} days in Draft.${escalationNote}`,
      type: 'system',
    });
  }
  return count;
};

// Day 12: urgent reminder, for courses not already caught by the day-14 sweep above.
const runUrgentInactivityWarning = async () => {
  const urgentCutoff = new Date(Date.now() - INACTIVITY_URGENT_WARNING_DAYS * DAY_MS);
  const draftCutoff = new Date(Date.now() - INACTIVITY_DRAFT_DAYS * DAY_MS);
  const candidates = await Course.find({
    courseType: 'ongoing',
    status: 'approved',
    lastPublishedContentAt: { $lte: urgentCutoff, $gt: draftCutoff },
    inactivityUrgentWarningSentAt: null,
  }).select('_id instructor title');

  let count = 0;
  for (const candidate of candidates) {
    const course = await Course.findOneAndUpdate(
      { _id: candidate._id, inactivityUrgentWarningSentAt: null },
      { inactivityUrgentWarningSentAt: new Date() },
      { new: true }
    );
    if (!course) continue;
    count += 1;
    await Notification.create({
      user: course.instructor,
      title: 'Urgent: Course Approaching Inactivity Deadline',
      message: `Your ongoing course "${course.title}" has not received a new lesson recently. Publish a new lesson within ${INACTIVITY_DRAFT_DAYS - INACTIVITY_URGENT_WARNING_DAYS} days to keep your course active.`,
      type: 'system',
    });
  }
  return count;
};

// Day 10: first reminder.
const runInactivityWarning = async () => {
  const warningCutoff = new Date(Date.now() - INACTIVITY_WARNING_DAYS * DAY_MS);
  const urgentCutoff = new Date(Date.now() - INACTIVITY_URGENT_WARNING_DAYS * DAY_MS);
  const candidates = await Course.find({
    courseType: 'ongoing',
    status: 'approved',
    lastPublishedContentAt: { $lte: warningCutoff, $gt: urgentCutoff },
    inactivityWarningSentAt: null,
  }).select('_id instructor title');

  let count = 0;
  for (const candidate of candidates) {
    const course = await Course.findOneAndUpdate(
      { _id: candidate._id, inactivityWarningSentAt: null },
      { inactivityWarningSentAt: new Date() },
      { new: true }
    );
    if (!course) continue;
    count += 1;
    await Notification.create({
      user: course.instructor,
      title: 'Course Approaching Inactivity Deadline',
      message: `Your course has not received a new lesson recently. Publish a new lesson within ${INACTIVITY_DRAFT_DAYS - INACTIVITY_WARNING_DAYS} days to keep your course active.`,
      type: 'system',
    });
  }
  return count;
};

// Full inactivity sweep: day-14 transition, then day-12 urgent warning, then
// day-10 warning. Order matters — see comments above.
export const runOngoingInactivityCheck = async () => {
  const moved = await runInactivityDraftTransition();
  const urgentWarned = await runUrgentInactivityWarning();
  const warned = await runInactivityWarning();
  logger.info('Ongoing inactivity check completed', { moved, urgentWarned, warned });
  return { moved, urgentWarned, warned };
};

// Day 90: no qualifying content since the course entered Draft -> archived.
// Archiving only changes Course.status; Module/Lesson documents and all
// Enrollment/Transaction records are left untouched (see CLAUDE.md's note
// that financial records must never be casually deleted).
const runDraftArchival = async () => {
  const cutoff = new Date(Date.now() - DRAFT_EXPIRATION_DAYS * DAY_MS);
  const candidates = await Course.find({
    courseType: 'ongoing',
    status: 'draft',
    draftStartedAt: { $lte: cutoff },
  }).select('_id instructor title');

  let count = 0;
  for (const candidate of candidates) {
    const course = await Course.findOneAndUpdate(
      { _id: candidate._id, courseType: 'ongoing', status: 'draft', draftStartedAt: { $lte: cutoff } },
      { status: 'archived' },
      { new: true }
    );
    if (!course) continue;
    count += 1;
    await Notification.create({
      user: course.instructor,
      title: 'Course Archived',
      message: `Your course "${course.title}" was removed from the marketplace after remaining in Draft for ${DRAFT_EXPIRATION_DAYS} days. Its content and enrollment/payment history have been preserved — contact support if you'd like to discuss restoring it.`,
      type: 'system',
    });
  }
  return count;
};

// Day 80: "approaching deletion" reminder, for drafts not yet archived.
const runDraftExpirationWarning = async () => {
  const warningCutoff = new Date(Date.now() - DRAFT_EXPIRATION_WARNING_DAYS * DAY_MS);
  const archiveCutoff = new Date(Date.now() - DRAFT_EXPIRATION_DAYS * DAY_MS);
  const candidates = await Course.find({
    courseType: 'ongoing',
    status: 'draft',
    draftStartedAt: { $lte: warningCutoff, $gt: archiveCutoff },
    draftExpirationWarningSentAt: null,
  }).select('_id instructor title');

  let count = 0;
  for (const candidate of candidates) {
    const course = await Course.findOneAndUpdate(
      { _id: candidate._id, draftExpirationWarningSentAt: null },
      { draftExpirationWarningSentAt: new Date() },
      { new: true }
    );
    if (!course) continue;
    count += 1;
    const daysRemaining = DRAFT_EXPIRATION_DAYS - DRAFT_EXPIRATION_WARNING_DAYS;
    await Notification.create({
      user: course.instructor,
      title: 'Draft Course Approaching Removal',
      message: `Your draft course "${course.title}" will be permanently removed in ${daysRemaining} days unless you continue it, delete it, or convert it to a Full Course.`,
      type: 'system',
    });
  }
  return count;
};

// Full draft-expiration sweep: day-90 archival, then day-80 warning.
export const runDraftExpirationCheck = async () => {
  const archived = await runDraftArchival();
  const warned = await runDraftExpirationWarning();
  logger.info('Draft expiration check completed', { archived, warned });
  return { archived, warned };
};
