import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';
import Transaction from '../models/Transaction.js';
import PromoCode from '../models/PromoCode.js';
import DiscountCode from '../models/DiscountCode.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import * as emailService from '../utils/emailService.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { getModulesWithLessons, computeModuleProgress } from '../utils/courseContent.js';
import { validateManualPaymentProof } from '../utils/manualPayment.js';

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const getDiscountQuote = async (course, rawCode) => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { originalPrice: course.price, discountPercentage: 0, discountAmount: 0, finalPrice: course.price, code: '' };
  const discount = await DiscountCode.findOne({ code, isActive: true, expiresAt: { $gt: new Date() } });
  if (!discount || discount.discountPercentage < 1 || discount.discountPercentage > 99) return null;
  const discountAmount = roundMoney(course.price * discount.discountPercentage / 100);
  return { originalPrice: course.price, discountPercentage: discount.discountPercentage, discountAmount, finalPrice: roundMoney(course.price - discountAmount), code: discount.code };
};

export const validateDiscountCode = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.status !== 'approved') return res.status(400).json({ message: 'Code not valid' });
    
    let priceToUse = course.price;
    if (req.body.moduleId) {
      const { default: Module } = await import('../models/Module.js');
      const module = await Module.findOne({ _id: req.body.moduleId, course: course._id });
      if (!module) return res.status(404).json({ message: 'Module not found' });
      priceToUse = module.price;
    }

    if (!Number.isFinite(priceToUse) || priceToUse <= 0) return res.status(400).json({ message: 'Code not valid' });

    const quote = await getDiscountQuote({ price: priceToUse }, req.body.code);
    if (!quote) return res.status(400).json({ message: 'Code not valid' });
    res.json({ valid: true, ...quote });
  } catch (error) { logger.error('Discount validation failed', { error: error.message }); res.status(400).json({ message: 'Code not valid' }); }
};

// @route   POST /api/enrollments/:courseId
// @access  Private (student)
export const enroll = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { promoCode, discountCode } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.status !== 'approved') {
      return res.status(403).json({ message: 'This course is not open for enrollment yet' });
    }
    if (!Number.isFinite(course.price) || course.price <= 0) return res.status(400).json({ message: 'This legacy course needs a valid paid price before enrollment' });

    const existing = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (existing) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }

    const validation = validateManualPaymentProof(req.body);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const paymentProof = validation.proof;
    const quote = await getDiscountQuote(course, discountCode);
    if (!quote) return res.status(400).json({ message: 'Code not valid' });

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
      instructorShare = quote.finalPrice * 0.85;
      platformCommission = quote.finalPrice * 0.15;
      commissionRate = 15;
    } else if (appliedPromo) {
      instructorShare = quote.finalPrice * 0.85;
      platformCommission = quote.finalPrice * 0.15;
      commissionRate = 15;
    } else {
      // Everyone else keeps using the admin-configurable commission rate
      // (System Management > Commission Slider), same as before this PR.
      const config = await getInternalConfig();
      const commissionPercent = config?.financial?.commission ?? 15;
      platformCommission = (quote.finalPrice * commissionPercent) / 100;
      instructorShare = quote.finalPrice - platformCommission;
      commissionRate = commissionPercent;
    }

    const status = 'pending';
    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: courseId,
      amountPaid: quote.finalPrice,
      originalPrice: quote.originalPrice,
      discountCode: quote.code,
      discountPercentage: quote.discountPercentage,
      discountAmount: quote.discountAmount,
      platformCommission,
      instructorShare,
      status,
      ...paymentProof,
    });

    if (status === 'pending') {
      try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const student = await User.findById(req.user.id);
        const studentName = student ? student.name : 'A student';
        
        const notifications = admins.map(admin => ({
          user: admin._id,
          title: 'New Enrollment Request',
          message: `${studentName} has requested to enroll in "${course.title}". Invoice ID: ${paymentProof.invoiceId}.`,
          type: 'system',
          link: '/admin',
          refId: enrollment._id,
        }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        try {
          await emailService.sendAdminNewRequestEmail({
            adminEmails: admins.map(a => ({ email: a.email, name: a.name })),
            request_id: enrollment._id,
            request_type_label: 'New Enrollment Request',
            request_type_tag: 'ENROLL',
            submitted_date: new Date().toLocaleDateString(),
            item_title: course.title,
            requester_name: studentName,
            requester_role: 'Student',
            review_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/enrollments`,
            queue_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/requests`,
            settings_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/settings`
          });
        } catch (emailErr) {
          logger.error('Failed to send admin email notification for new enrollment', { err: emailErr.message });
        }
      } catch (err) {
        logger.error('Failed to create admin notifications', { error: err.message, stack: err.stack });
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
    logger.error('An error occurred', { error: error.message, stack: error.stack });
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

    const { default: ModulePurchase } = await import('../models/ModulePurchase.js');
    const modulePurchases = await ModulePurchase.find({ 
      student: req.user.id, 
      status: { $in: ['approved', 'pending', 'under_review'] } 
    }).populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name avatar isProgramInstructor' }
      });

    const enrollmentCourseIds = new Set(enrollments.map(e => e.course?._id?.toString()).filter(Boolean));
    const extraOngoingCoursesMap = new Map();
    for (const mp of modulePurchases) {
      if (!mp.course) continue;
      const cId = mp.course._id.toString();
      if (!enrollmentCourseIds.has(cId)) {
        if (!extraOngoingCoursesMap.has(cId)) {
          extraOngoingCoursesMap.set(cId, { course: mp.course, status: mp.status });
        } else if (mp.status === 'approved') {
          extraOngoingCoursesMap.get(cId).status = 'approved';
        }
      }
    }

    const virtualEnrollments = Array.from(extraOngoingCoursesMap.values()).map(({ course, status }) => ({
      _id: `virtual-${course._id}`,
      course,
      completedLessons: [],
      progressPercent: 0,
      student: req.user.id,
      status,
      isVirtual: true,
    }));

    const validEnrollments = enrollments.filter((enrollment) => enrollment.course);
    const allEnrollments = [...validEnrollments, ...virtualEnrollments];

    const withProgress = await Promise.all(
      allEnrollments.map(async (enrollment) => {
        const isVirtual = enrollment.isVirtual;
        const grouped = await getModulesWithLessons(enrollment.course._id);
        const allLessons = grouped.flatMap(({ lessons }) => lessons);
        const totalLessons = allLessons.length;
        
        const completedCount = enrollment.completedLessons.length;
        const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
        
        const completedIds = enrollment.completedLessons.map(id => id.toString());
        const currentLesson = allLessons.find(lesson => !completedIds.includes(lesson._id.toString())) || null;

        const baseObj = isVirtual ? enrollment : enrollment.toObject();

        return { 
          ...baseObj, 
          totalLessons, 
          progressPercent,
          currentLesson: currentLesson ? { title: currentLesson.title, duration: currentLesson.duration || 10, _id: currentLesson._id } : null
        };
      })
    );

    res.status(200).json({ enrollments: withProgress });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching your enrollments' });
  }
};

// @route   GET /api/enrollments/:courseId
// @access  Private — used by the course details page and lesson player to
// check "is this student enrolled, and how far have they gotten?"
export const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;

    let enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    const course = await Course.findById(courseId);

    if (!enrollment) {
      if (course && course.courseType === 'ongoing') {
        const grouped = await getModulesWithLessons(courseId);
        const totalLessons = grouped.reduce((sum, { lessons }) => sum + lessons.length, 0);
        return res.status(200).json({
          enrolled: true,
          status: 'approved',
          completedLessonIds: [],
          totalLessons,
          progressPercent: 0,
          moduleProgress: computeModuleProgress(grouped, []),
        });
      }
      return res.status(200).json({ enrolled: false });
    }

    const grouped = await getModulesWithLessons(courseId);
    const totalLessons = grouped.reduce((sum, { lessons }) => sum + lessons.length, 0);
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      enrolled: true,
      status: enrollment.status,
      completedLessonIds: enrollment.completedLessons,
      totalLessons,
      progressPercent,
      moduleProgress: computeModuleProgress(grouped, enrollment.completedLessons),
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error checking enrollment' });
  }
};

// @route   PATCH /api/enrollments/:courseId/lessons/:lessonId/complete
// @access  Private (must be enrolled in the course)
export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    let enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) {
      const course = await Course.findById(courseId);
      if (course && course.courseType === 'ongoing') {
        enrollment = await Enrollment.create({
          student: req.user.id,
          course: courseId,
          amountPaid: 0,
          originalPrice: 0,
          paymentMethod: 'none',
          status: 'approved',
          completedLessons: [],
        });
      } else {
        return res.status(403).json({ message: 'You must enroll in this course first' });
      }
    }
    if (enrollment.status !== 'approved') {
      return res.status(403).json({ message: 'Your enrollment is pending approval' });
    }

    // Confirm the lesson actually belongs to this course — prevents a student
    // from marking a lesson from a DIFFERENT course as complete on this enrollment.
    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson || !lesson.module || lesson.module.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    // $addToSet instead of $push: adds the lesson only if it's not already in
    // the array, so clicking "mark complete" twice never creates duplicates.
    enrollment.completedLessons.addToSet(lessonId);
    await enrollment.save();

    const grouped = await getModulesWithLessons(courseId);
    const totalLessons = grouped.reduce((sum, { lessons }) => sum + lessons.length, 0);
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      completedLessonIds: enrollment.completedLessons,
      totalLessons,
      progressPercent,
      moduleProgress: computeModuleProgress(grouped, enrollment.completedLessons),
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error marking lesson complete' });
  }
};
