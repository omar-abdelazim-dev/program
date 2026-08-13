import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';
import Transaction from '../models/Transaction.js';
import Section from '../models/Section.js';
import PromoCode from '../models/PromoCode.js';
import Notification from '../models/Notification.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import { getActiveShiftAdmin } from '../utils/adminShiftService.js';

const generateTxnId = (prefix = 'PRG-TXN') => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

// @route   POST /api/enrollments/request/:courseId
// @access  Private (student)
export const requestEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { providerTransactionId, payerNumber, paymentMethod, screenshotUrl, promoCode, expectedFees = 10 } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.status !== 'approved') {
      return res.status(403).json({ message: 'This course is not open for enrollment yet' });
    }

    // Check existing enrollment or request
    const existing = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (existing) {
      if (existing.status === 'approved') {
        return res.status(409).json({ message: 'You are already enrolled in this course' });
      }
      if (existing.status === 'pending' || existing.status === 'under_review') {
        return res.status(409).json({ message: 'You already have a pending enrollment request for this course' });
      }
    }

    // Free courses (price === 0) auto-enroll as approved
    if (course.price === 0) {
      const enrollment = await Enrollment.create({
        student: req.user.id,
        course: courseId,
        amountPaid: 0,
        platformCommission: 0,
        instructorShare: 0,
        status: 'approved',
      });
      return res.status(201).json({ message: 'Enrolled in free course successfully!', enrollment });
    }

    // Paid courses REQUIRE payment proof details for admin approval
    if (!providerTransactionId || !payerNumber || !paymentMethod || !screenshotUrl) {
      return res.status(400).json({ message: 'Payment verification details (providerTransactionId, payerNumber, paymentMethod, screenshotUrl) are required for paid course enrollment.' });
    }

    // Prevent reuse of external provider transaction ID across approved enrollments
    const normalizedProviderTxId = providerTransactionId.trim();
    const reusedCheck = await Enrollment.findOne({
      providerTransactionId: normalizedProviderTxId,
      status: 'approved',
    });
    if (reusedCheck) {
      return res.status(400).json({ message: 'This external provider transaction ID has already been used for a successful enrollment.' });
    }

    const programTxId = generateTxnId('PRG-TXN');
    const activeAdmin = await getActiveShiftAdmin();

    const enrollmentData = {
      student: req.user.id,
      course: courseId,
      amountPaid: course.price,
      programTransactionId: programTxId,
      providerTransactionId: normalizedProviderTxId,
      payerNumber: payerNumber.trim(),
      paymentMethod,
      screenshotUrl,
      expectedFees: Number(expectedFees) || 0,
      notifiedAdmin: activeAdmin ? activeAdmin._id : null,
      status: 'pending',
    };

    let enrollment;
    if (existing && existing.status === 'rejected') {
      // Re-submit rejected request
      Object.assign(existing, enrollmentData);
      enrollment = await existing.save();
    } else {
      enrollment = await Enrollment.create(enrollmentData);
    }

    // In-app Notification for Student
    await Notification.create({
      user: req.user.id,
      title: 'Enrollment Request Received',
      message: `We have received your payment request for "${course.title}". Your request (ID: ${programTxId}) will be reviewed within 3 hours during working hours.`,
      type: 'enrollment_request',
      link: `/course/${courseId}`,
    });

    // In-app Notification for Active Shift Admin
    if (activeAdmin) {
      await Notification.create({
        user: activeAdmin._id,
        title: 'New Student Enrollment Request',
        message: `Student requested enrollment for "${course.title}". Provider TX ID: ${normalizedProviderTxId}, Program TX ID: ${programTxId}.`,
        type: 'enrollment_request',
        link: '/admin',
      });
    }

    res.status(201).json({
      message: 'Enrollment request submitted successfully. Awaiting admin review.',
      enrollment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A request with this transaction ID already exists.' });
    }
    console.error('Error requesting enrollment:', error);
    res.status(500).json({ message: 'Server error creating enrollment request' });
  }
};

// @route   GET /api/enrollments/admin/requests
// @access  Private (admin only)
export const getAdminEnrollmentRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await Enrollment.find(query)
      .populate('student', 'name email phone avatar')
      .populate({
        path: 'course',
        select: 'title price thumbnail instructor',
        populate: { path: 'instructor', select: 'name email isProgramInstructor' },
      })
      .populate('notifiedAdmin', 'name email')
      .populate('reviewedByAdmin', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching admin enrollment requests:', error);
    res.status(500).json({ message: 'Server error fetching enrollment requests' });
  }
};

// @route   PATCH /api/enrollments/admin/requests/:requestId/approve
// @access  Private (admin only)
export const approveEnrollmentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const enrollment = await Enrollment.findById(requestId).populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment request not found' });
    }
    if (enrollment.status === 'approved') {
      return res.status(400).json({ message: 'This enrollment request is already approved' });
    }

    // Verify provider TX ID uniqueness
    if (enrollment.providerTransactionId) {
      const reused = await Enrollment.findOne({
        _id: { $ne: enrollment._id },
        providerTransactionId: enrollment.providerTransactionId,
        status: 'approved',
      });
      if (reused) {
        return res.status(400).json({ message: 'Cannot approve: External provider transaction ID was already used in another approved enrollment.' });
      }
    }

    const course = enrollment.course;
    const instructor = await User.findById(course.instructor);
    let platformCommission = 0;
    let instructorShare = 0;
    let commissionRate = 15;

    if (instructor && instructor.isProgramInstructor) {
      instructorShare = course.price * 0.85;
      platformCommission = course.price * 0.15;
      commissionRate = 15;
    } else {
      const config = await getInternalConfig();
      const commissionPercent = config?.financial?.commission ?? 15;
      platformCommission = (course.price * commissionPercent) / 100;
      instructorShare = course.price - platformCommission;
      commissionRate = commissionPercent;
    }

    enrollment.status = 'approved';
    enrollment.platformCommission = platformCommission;
    enrollment.instructorShare = instructorShare;
    enrollment.reviewedByAdmin = req.user.id;
    await enrollment.save();

    // Create central ledger record for student payment
    await Transaction.create({
      programTransactionId: enrollment.programTransactionId,
      providerTransactionId: enrollment.providerTransactionId,
      student: enrollment.student,
      instructor: course.instructor,
      course: course._id,
      amount: course.price,
      type: 'enrollment_payment',
      status: 'completed',
      description: `Student Payment - Enrollment in ${course.title}`,
      reviewedByAdmin: req.user.id,
    });

    // Create revenue transaction for instructor if price > 0
    if (course.price > 0 && course.instructor) {
      await Transaction.create({
        programTransactionId: generateTxnId('PRG-REV'),
        instructor: course.instructor,
        course: course._id,
        amount: instructorShare,
        type: 'course_sale',
        status: 'cleared',
        description: `Course Sale Revenue Share - ${course.title}`,
        commissionRate,
        reviewedByAdmin: req.user.id,
      });
    }

    // Notify Student
    await Notification.create({
      user: enrollment.student,
      title: 'Enrollment Approved!',
      message: `Your enrollment request for "${course.title}" has been approved. You now have full access to the course!`,
      type: 'enrollment_approval',
      link: `/course/${course._id}`,
    });

    res.status(200).json({ message: 'Enrollment request approved successfully', enrollment });
  } catch (error) {
    console.error('Error approving enrollment request:', error);
    res.status(500).json({ message: 'Server error approving enrollment request' });
  }
};

// @route   PATCH /api/enrollments/admin/requests/:requestId/reject
// @access  Private (admin only)
export const rejectEnrollmentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: 'A rejection reason is required.' });
    }

    const enrollment = await Enrollment.findById(requestId).populate('course');
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment request not found' });
    }
    if (enrollment.status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject an already approved enrollment.' });
    }

    const refundTxId = generateTxnId('PRG-REF');
    enrollment.status = 'rejected';
    enrollment.rejectionReason = rejectionReason.trim();
    enrollment.refundTransactionId = refundTxId;
    enrollment.reviewedByAdmin = req.user.id;
    await enrollment.save();

    // Create refund ledger entry
    await Transaction.create({
      programTransactionId: refundTxId,
      providerTransactionId: enrollment.providerTransactionId,
      student: enrollment.student,
      instructor: enrollment.course?.instructor,
      course: enrollment.course?._id,
      amount: enrollment.amountPaid,
      type: 'refund',
      status: 'pending',
      description: `Refund for Rejected Enrollment - ${enrollment.course?.title}`,
      reviewedByAdmin: req.user.id,
    });

    // Notify Student
    await Notification.create({
      user: enrollment.student,
      title: 'Enrollment Request Rejected',
      message: `Your enrollment request for "${enrollment.course?.title}" was rejected. Reason: ${rejectionReason.trim()}. Refund transaction ID: ${refundTxId}.`,
      type: 'enrollment_rejection',
      link: `/course/${enrollment.course?._id}`,
    });

    res.status(200).json({ message: 'Enrollment request rejected and refund record generated', enrollment });
  } catch (error) {
    console.error('Error rejecting enrollment request:', error);
    res.status(500).json({ message: 'Server error rejecting enrollment request' });
  }
};

// Legacy direct enroll helper
export const enroll = async (req, res) => {
  return requestEnrollment(req, res);
};

// @route   GET /api/enrollments/mine
// @access  Private (student)
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user.id, status: 'approved' })
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name avatar isProgramInstructor' }
      })
      .sort({ updatedAt: -1 });

    const validEnrollments = enrollments.filter((enrollment) => enrollment.course);

    const withProgress = await Promise.all(
      validEnrollments.map(async (enrollment) => {
        const sections = await Section.find({ course: enrollment.course._id });
        const sectionIds = sections.map(s => s._id);
        const allLessons = await Lesson.find({ section: { $in: sectionIds } }).sort({ order: 1 });
        const totalLessons = allLessons.length;
        
        const completedCount = enrollment.completedLessons.length;
        const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
        
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
// @access  Private
export const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    if (!enrollment) {
      return res.status(200).json({ enrolled: false });
    }

    if (enrollment.status !== 'approved') {
      return res.status(200).json({
        enrolled: false,
        requestStatus: enrollment.status,
        programTransactionId: enrollment.programTransactionId,
        rejectionReason: enrollment.rejectionReason,
      });
    }

    const sections = await Section.find({ course: courseId });
    const sectionIds = sections.map(s => s._id);
    const totalLessons = await Lesson.countDocuments({ section: { $in: sectionIds } });
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    res.status(200).json({
      enrolled: true,
      requestStatus: 'approved',
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
// @access  Private
export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId, status: 'approved' });
    if (!enrollment) {
      return res.status(403).json({ message: 'You must have an approved enrollment in this course first' });
    }

    const lesson = await Lesson.findById(lessonId).populate('section');
    if (!lesson || !lesson.section || lesson.section.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

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
