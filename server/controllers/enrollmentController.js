import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';

// @route   POST /api/enrollments/:courseId
// @access  Private (student)
export const enroll = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.status !== 'approved') {
      return res.status(403).json({ message: 'This course is not open for enrollment yet' });
    }

    const existing = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (existing) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }

    const enrollment = await Enrollment.create({ student: req.user.id, course: courseId });
    res.status(201).json({ enrollment });
  } catch (error) {
    // A duplicate-key error (code 11000) means the unique index caught a
    // race condition the check above missed — same friendly message either way.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }
    res.status(500).json({ message: 'Server error enrolling in course', error: error.message });
  }
};

// @route   GET /api/enrollments/mine
// @access  Private (student) — powers the "My Learning" dashboard
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate('course')
      .sort({ updatedAt: -1 });

    // Attach a computed progress percentage to each enrollment so the
    // frontend doesn't have to fetch lesson counts separately for every card.
    const withProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalLessons = await Lesson.countDocuments({ course: enrollment.course._id });
        const completedCount = enrollment.completedLessons.length;
        const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
        return { ...enrollment.toObject(), totalLessons, progressPercent };
      })
    );

    res.status(200).json({ enrollments: withProgress });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching your enrollments', error: error.message });
  }
};

// @route   GET /api/enrollments/:courseId
// @access  Private — used by the course details page and lesson player to
// check "is this student enrolled, and how far have they gotten?"
export const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) {
      return res.status(200).json({ enrolled: false });
    }

    const totalLessons = await Lesson.countDocuments({ course: courseId });
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      enrolled: true,
      completedLessonIds: enrollment.completedLessons,
      totalLessons,
      progressPercent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error checking enrollment', error: error.message });
  }
};

// @route   PATCH /api/enrollments/:courseId/lessons/:lessonId/complete
// @access  Private (must be enrolled in the course)
export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) {
      return res.status(403).json({ message: 'You must enroll in this course first' });
    }

    // Confirm the lesson actually belongs to this course — prevents a student
    // from marking a lesson from a DIFFERENT course as complete on this enrollment.
    const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    // $addToSet instead of $push: adds the lesson only if it's not already in
    // the array, so clicking "mark complete" twice never creates duplicates.
    enrollment.completedLessons.addToSet(lessonId);
    await enrollment.save();

    const totalLessons = await Lesson.countDocuments({ course: courseId });
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      completedLessonIds: enrollment.completedLessons,
      totalLessons,
      progressPercent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking lesson complete', error: error.message });
  }
};
