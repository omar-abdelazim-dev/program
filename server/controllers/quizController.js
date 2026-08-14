import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import QuizSubmission from '../models/QuizSubmission.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { getModulesWithLessons, computeModuleProgress } from '../utils/courseContent.js';

// @route   POST /api/enrollments/:courseId/lessons/:lessonId/quiz-submit
// @access  Private (student, must be an approved enrollment)
// Grades multiple-choice answers immediately; written answers are stored
// pending instructor review. Submitting always marks the lesson complete —
// same unconditional semantics as markLessonComplete for video lessons. A
// student can resubmit (re-grading MCQs) while the submission is still
// pending_review; once an instructor grades it, it's locked.
export const submitQuiz = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { answers } = req.body;

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) {
      return res.status(403).json({ message: 'You must enroll in this course first' });
    }
    if (enrollment.status !== 'approved') {
      return res.status(403).json({ message: 'Your enrollment is pending approval' });
    }

    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson || !lesson.module || lesson.module.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }
    if (lesson.lessonType !== 'quiz') {
      return res.status(400).json({ message: 'This lesson is not a quiz' });
    }

    const existing = await QuizSubmission.findOne({ student: req.user.id, lesson: lessonId });
    if (existing && existing.status === 'graded') {
      return res.status(409).json({ message: 'This quiz has already been graded and can no longer be resubmitted' });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers array is required' });
    }
    const answersByIndex = new Map(answers.map((a) => [a.questionIndex, a]));

    let autoScore = 0;
    let maxScore = 0;
    let hasWritten = false;
    const gradedAnswers = lesson.quiz.questions.map((q, questionIndex) => {
      maxScore += q.points;
      const submitted = answersByIndex.get(questionIndex) || {};

      if (q.type === 'mcq') {
        const selectedOptionIndex = Number.isInteger(submitted.selectedOptionIndex)
          ? submitted.selectedOptionIndex
          : null;
        const isCorrect = selectedOptionIndex === q.correctOptionIndex;
        const pointsAwarded = isCorrect ? q.points : 0;
        autoScore += pointsAwarded;
        return { questionIndex, selectedOptionIndex, isCorrect, pointsAwarded };
      }

      hasWritten = true;
      return { questionIndex, textAnswer: (submitted.textAnswer || '').trim() };
    });

    const status = hasWritten ? 'pending_review' : 'graded';

    const submission = await QuizSubmission.findOneAndUpdate(
      { student: req.user.id, lesson: lessonId },
      {
        course: courseId,
        lesson: lessonId,
        student: req.user.id,
        answers: gradedAnswers,
        autoScore,
        maxScore,
        status,
        gradedAt: status === 'graded' ? new Date() : null,
        gradedBy: null,
      },
      { new: true, upsert: true }
    );

    // Only worth an instructor's attention if something needs manual grading.
    if (hasWritten) {
      const course = await Course.findById(courseId);
      if (course) {
        await Notification.create({
          user: course.instructor,
          title: 'New quiz submission to grade',
          message: `A student submitted "${lesson.title}" in "${course.title}" — written answers need grading.`,
          type: 'quiz_submitted',
          link: '/instructor',
          refId: submission._id,
        });
      }
    }

    enrollment.completedLessons.addToSet(lessonId);
    await enrollment.save();

    const grouped = await getModulesWithLessons(courseId);
    const totalLessons = grouped.reduce((sum, { lessons }) => sum + lessons.length, 0);
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      submission,
      completedLessonIds: enrollment.completedLessons,
      totalLessons,
      progressPercent,
      moduleProgress: computeModuleProgress(grouped, enrollment.completedLessons),
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error submitting quiz' });
  }
};

// @route   GET /api/enrollments/:courseId/lessons/:lessonId/quiz-submission
// @access  Private (student) — lets the player show a past result/status
// instead of a blank form when the student revisits a quiz lesson.
export const getMySubmission = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const submission = await QuizSubmission.findOne({ student: req.user.id, lesson: lessonId });
    res.status(200).json({ submission: submission || null });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching quiz submission' });
  }
};

// @route   GET /api/quiz-submissions?status=pending_review
// @access  Private (instructor) — the grading queue, scoped to the
// instructor's own courses. Same shape as engagementController.getInstructorQuestions.
export const getGradingQueue = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).select('_id');
    const courseIds = courses.map((c) => c._id);

    const filter = { course: { $in: courseIds } };
    if (req.query.status) filter.status = req.query.status;

    const submissions = await QuizSubmission.find(filter)
      .populate('student', 'name avatarUrl')
      .populate('lesson', 'title quiz')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ submissions });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching grading queue' });
  }
};

// @route   PATCH /api/quiz-submissions/:id/grade
// @access  Private (instructor, must own the course)
// Body: { grades: [{ questionIndex, pointsAwarded, feedback }] } — one entry
// per written question. Grades the whole submission in a single action.
export const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades } = req.body;

    const submission = await QuizSubmission.findById(id).populate('course', 'instructor');
    if (!submission || !submission.course) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    if (submission.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You do not own this course' });
    }
    if (!Array.isArray(grades)) {
      return res.status(400).json({ message: 'grades array is required' });
    }

    const gradesByIndex = new Map(grades.map((g) => [g.questionIndex, g]));
    const updatedAnswers = submission.answers.map((answer) => {
      const grade = gradesByIndex.get(answer.questionIndex);
      if (answer.textAnswer === undefined || !grade) return answer;
      return {
        ...answer.toObject(),
        pointsAwarded: Number(grade.pointsAwarded) || 0,
        feedback: grade.feedback || '',
      };
    });

    // Atomic guard on status: 'pending_review' — same double-action race
    // protection as adminController.approveEnrollment.
    const graded = await QuizSubmission.findOneAndUpdate(
      { _id: id, status: 'pending_review' },
      { answers: updatedAnswers, status: 'graded', gradedAt: new Date(), gradedBy: req.user.id },
      { new: true }
    );
    if (!graded) {
      return res.status(409).json({ message: 'This submission has already been graded' });
    }

    const lesson = await Lesson.findById(graded.lesson).select('title');
    await Notification.create({
      user: graded.student,
      title: 'Your quiz has been graded',
      message: `Your written answers for "${lesson?.title || 'a quiz'}" have been graded.`,
      type: 'quiz_graded',
      link: `/learn/${graded.course}`,
      refId: graded._id,
    });

    res.status(200).json({ submission: graded });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error grading submission' });
  }
};
