import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Transaction from '../models/Transaction.js';

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

    const enrollment = await Enrollment.create({ 
      student: req.user.id, 
      course: courseId,
      amountPaid: course.price
    });

    // Generate 70% revenue split transaction for the instructor
    if (course.price > 0 && course.instructor) {
      const instructorCut = course.price * 0.7;
      await Transaction.create({
        instructor: course.instructor,
        amount: instructorCut,
        type: 'course_sale',
        status: 'cleared',
        description: `Course Sale - ${course.title}`,
        course: course._id
      });
    }

    res.status(201).json({ enrollment });
  } catch (error) {
    // A duplicate-key error (code 11000) means the unique index caught a
    // race condition the check above missed — same friendly message either way.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error enrolling in course' });
  }
};

// @route   GET /api/enrollments/mine
// @access  Private (student) — powers the "My Learning" dashboard
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name avatar isProgramInstructor' }
      })
      .sort({ updatedAt: -1 });

    // Attach a computed progress percentage to each enrollment so the
    // frontend doesn't have to fetch lesson counts separately for every card.
    const withProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Fetch all lessons for the course, sorted by order
        const allLessons = await Lesson.find({ course: enrollment.course._id }).sort({ order: 1 });
        const totalLessons = allLessons.length;
        
        // Use completedLessons to calculate progress
        const completedCount = enrollment.completedLessons.length;
        const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
        
        // Find current lesson: first lesson not in completedLessons
        const completedIds = enrollment.completedLessons.map(id => id.toString());
        const currentLesson = allLessons.find(lesson => !completedIds.includes(lesson._id.toString())) || null;

        return { 
          ...enrollment.toObject(), 
          totalLessons, 
          progressPercent,
          currentLesson: currentLesson ? { title: currentLesson.title, duration: currentLesson.duration || 10, _id: currentLesson._id } : null
        };
      })
    );

    res.status(200).json({ enrollments: withProgress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching your enrollments' });
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
    console.error(error);
    res.status(500).json({ message: 'Server error checking enrollment' });
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
    console.error(error);
    res.status(500).json({ message: 'Server error marking lesson complete' });
  }
};
