import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';
import Transaction from '../models/Transaction.js';
import Section from '../models/Section.js';
import PromoCode from '../models/PromoCode.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import Notification from '../models/Notification.js';

// @route   POST /api/enrollments/:courseId
// @access  Private (student)
export const enroll = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { promoCode } = req.body;

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

    // Calculate financial distribution
    const instructor = await User.findById(course.instructor);
    let platformCommission = 0;
    let instructorShare = 0;
    let commissionRate;

    // ADM-13: a promo/affiliate code tied to this course's (non-program)
    // instructor grants the same fixed 85/15 split a program instructor gets.
    const appliedPromo = promoCode
      ? await PromoCode.findOne({ code: promoCode.toUpperCase().trim(), instructor: course.instructor, active: true })
      : null;

    if (instructor && instructor.isProgramInstructor) {
      // Program instructors get a fixed 85% cut, platform keeps 15% —
      // deliberately not admin-configurable, this is the flat benefit of
      // program-instructor status.
      instructorShare = course.price * 0.85;
      platformCommission = course.price * 0.15;
      commissionRate = 15;
    } else if (appliedPromo) {
      instructorShare = course.price * 0.85;
      platformCommission = course.price * 0.15;
      commissionRate = 15;
    } else {
      // Everyone else keeps using the admin-configurable commission rate
      // (System Management > Commission Slider), same as before this PR.
      const config = await getInternalConfig();
      const commissionPercent = config?.financial?.commission ?? 15;
      platformCommission = (course.price * commissionPercent) / 100;
      instructorShare = course.price - platformCommission;
      commissionRate = commissionPercent;
    }

    const status = course.price > 0 ? 'pending' : 'approved';
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      amountPaid: course.price,
      platformCommission,
      instructorShare,
      status,
      transactionId: req.body.transactionId,
      paymentAccount: req.body.paymentAccount,
      paymentMethod: req.body.paymentMethod,
      screenshot: req.body.screenshot,
      invoiceId: req.body.invoiceId,
    });

    if (status === 'pending') {
      try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const student = await User.findById(req.user.id);
        const studentName = student ? student.name : 'A student';
        
        const notifications = admins.map(admin => ({
          user: admin._id,
          title: 'New Enrollment Request',
          message: `${studentName} has requested to enroll in "${course.title}". Invoice ID: ${req.body.invoiceId || 'N/A'}.`,
          type: 'system',
          link: '/admin',
          refId: enrollment._id,
        }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (err) {
        console.error('Failed to create admin notifications', err);
      }
    }

    // Generate revenue split transaction for the instructor
    if (status === 'approved' && course.price > 0 && course.instructor) {
      await Transaction.create({
        instructor: course.instructor,
        amount: instructorShare,
        type: 'course_sale',
        status: 'cleared',
        description: `Course Sale - ${course.title}`,
        course: course._id,
        commissionRate,
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

    // Courses can be deleted while an enrollment still references them
    // (deleteCourse intentionally leaves enrollments for history) — skip those
    // rather than crashing on the null populated course.
    const validEnrollments = enrollments.filter((enrollment) => enrollment.course);

    // Attach a computed progress percentage to each enrollment so the
    // frontend doesn't have to fetch lesson counts separately for every card.
    const withProgress = await Promise.all(
      validEnrollments.map(async (enrollment) => {
        // Fetch all lessons for the course (via its sections), sorted by order
        const sections = await Section.find({ course: enrollment.course._id });
        const sectionIds = sections.map(s => s._id);
        const allLessons = await Lesson.find({ section: { $in: sectionIds } }).sort({ order: 1 });
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

    const sections = await Section.find({ course: courseId });
    const sectionIds = sections.map(s => s._id);
    const totalLessons = await Lesson.countDocuments({ section: { $in: sectionIds } });
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      enrolled: true,
      status: enrollment.status,
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
    const lesson = await Lesson.findById(lessonId).populate('section');
    if (!lesson || !lesson.section || lesson.section.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    // $addToSet instead of $push: adds the lesson only if it's not already in
    // the array, so clicking "mark complete" twice never creates duplicates.
    enrollment.completedLessons.addToSet(lessonId);
    await enrollment.save();

    const sections = await Section.find({ course: courseId });
    const sectionIds = sections.map(s => s._id);
    const totalLessons = await Lesson.countDocuments({ section: { $in: sectionIds } });
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
