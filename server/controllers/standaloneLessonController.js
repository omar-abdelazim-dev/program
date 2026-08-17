import StandaloneLesson from '../models/StandaloneLesson.js';
import StandaloneLessonPurchase from '../models/StandaloneLessonPurchase.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import logger from '../utils/logger.js';

// @route   POST /api/standalone-lessons
// @access  Private (instructor)
// spec §11: standalone lessons relate to one of the instructor's own Full
// Courses for discovery, but are never inserted into it and never modify it.
export const createStandaloneLesson = async (req, res) => {
  try {
    const { title, description, relatedCourseId, price, videoUrl, thumbnailUrl } = req.body;

    const relatedCourse = await Course.findById(relatedCourseId);
    if (!relatedCourse) {
      return res.status(404).json({ message: 'Related course not found' });
    }
    if (relatedCourse.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only relate a standalone lesson to your own course' });
    }
    if (relatedCourse.courseType !== 'full') {
      return res.status(400).json({ message: 'Standalone lessons can only be related to a Full Course' });
    }

    const lesson = await StandaloneLesson.create({
      title,
      description,
      instructor: req.user.id,
      relatedCourse: relatedCourseId,
      price,
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      status: 'pending',
    });

    res.status(201).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error creating standalone lesson' });
  }
};

// @route   GET /api/standalone-lessons/mine
// @access  Private (instructor)
export const getMyStandaloneLessons = async (req, res) => {
  try {
    const lessons = await StandaloneLesson.find({ instructor: req.user.id })
      .populate('relatedCourse', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json({ lessons });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching your standalone lessons' });
  }
};

// @route   PUT /api/standalone-lessons/:id
// @access  Private (instructor, owner only)
// Only editable while pending/rejected — once approved it's a purchasable
// listing students may already be relying on, same spirit as courses not
// being freely editable post-approval.
export const updateStandaloneLesson = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }
    if (lesson.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this lesson' });
    }
    if (!['pending', 'rejected'].includes(lesson.status)) {
      return res.status(400).json({ message: 'Only a pending or rejected standalone lesson can be edited' });
    }

    const { title, description, price, videoUrl, thumbnailUrl } = req.body;
    if (title) lesson.title = title;
    if (description) lesson.description = description;
    if (price !== undefined) lesson.price = price;
    if (videoUrl) lesson.videoUrl = videoUrl;
    if (thumbnailUrl !== undefined) lesson.thumbnailUrl = thumbnailUrl;
    if (lesson.status === 'rejected') {
      lesson.status = 'pending';
      lesson.rejectionReason = '';
    }

    await lesson.save();
    res.status(200).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error updating standalone lesson' });
  }
};

// @route   DELETE /api/standalone-lessons/:id
// @access  Private (instructor, owner only)
export const deleteStandaloneLesson = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'superAdmin';
    if (lesson.instructor.toString() !== req.user.id.toString() && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this lesson' });
    }

    const hasApprovedPurchase = await StandaloneLessonPurchase.exists({ lesson: lesson._id, status: 'approved' });
    if (hasApprovedPurchase) {
      return res.status(409).json({ message: 'Cannot delete a standalone lesson with an approved purchase' });
    }

    await StandaloneLesson.findByIdAndDelete(lesson._id);
    res.status(200).json({ message: 'Standalone lesson deleted' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error deleting standalone lesson' });
  }
};

// @route   GET /api/standalone-lessons?relatedCourseId=
// @access  Public — approved only. videoUrl deliberately excluded (same
// pattern as Course/getCourseById): real content is behind purchase.
export const getStandaloneLessons = async (req, res) => {
  try {
    const { relatedCourseId } = req.query;
    const filter = { status: 'approved' };
    if (relatedCourseId) filter.relatedCourse = relatedCourseId;

    const lessons = await StandaloneLesson.find(filter)
      .select('-videoUrl')
      .populate('relatedCourse', 'title')
      .populate('instructor', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ lessons });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching standalone lessons' });
  }
};

// @route   GET /api/standalone-lessons/:id
// @access  Public — approved only (owner/admin can preview any status).
// videoUrl excluded here too; see getStandaloneLessonAccess for the gated endpoint.
export const getStandaloneLessonById = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findById(req.params.id)
      .select('-videoUrl')
      .populate('relatedCourse', 'title')
      .populate('instructor', 'name');
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }

    const isOwner = req.user && lesson.instructor._id.toString() === req.user.id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (lesson.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(403).json({ message: 'This standalone lesson is not yet available' });
    }

    res.status(200).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching standalone lesson' });
  }
};

// @route   GET /api/standalone-lessons/:id/access
// @access  Private — owner, admin, or a student with an approved purchase
export const getStandaloneLessonAccess = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }

    const isOwner = lesson.instructor.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      const purchase = await StandaloneLessonPurchase.findOne({ student: req.user.id, lesson: lesson._id });
      if (!purchase) {
        return res.status(403).json({ message: 'Purchase this lesson to watch it' });
      }
      if (purchase.status !== 'approved') {
        return res.status(403).json({ message: 'Your purchase is pending approval' });
      }
    }

    res.status(200).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching standalone lesson content' });
  }
};

// @route   POST /api/standalone-lessons/:id/purchase
// @access  Private (student)
export const purchaseStandaloneLesson = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }
    if (lesson.status !== 'approved') {
      return res.status(403).json({ message: 'This standalone lesson is not open for purchase yet' });
    }

    const existing = await StandaloneLessonPurchase.findOne({ student: req.user.id, lesson: lesson._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already purchased this lesson' });
    }

    const instructor = await User.findById(lesson.instructor);
    let platformCommission = 0;
    let instructorShare = 0;
    if (instructor && instructor.isProgramInstructor) {
      instructorShare = lesson.price * 0.85;
      platformCommission = lesson.price * 0.15;
    } else {
      const config = await getInternalConfig();
      const commissionPercent = config?.financial?.commission ?? 15;
      platformCommission = (lesson.price * commissionPercent) / 100;
      instructorShare = lesson.price - platformCommission;
    }

    const status = lesson.price > 0 ? 'pending' : 'approved';
    const purchase = await StandaloneLessonPurchase.create({
      student: req.user.id,
      lesson: lesson._id,
      amountPaid: lesson.price,
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
        const notifications = admins.map((admin) => ({
          user: admin._id,
          title: 'New Standalone Lesson Purchase Request',
          message: `${student ? student.name : 'A student'} has requested to purchase "${lesson.title}". Invoice ID: ${req.body.invoiceId || 'N/A'}.`,
          type: 'system',
          link: '/admin',
          refId: purchase._id,
        }));
        if (notifications.length > 0) await Notification.insertMany(notifications);
      } catch (err) {
        logger.error('Failed to create admin notifications', { error: err.message, stack: err.stack });
      }
    }

    res.status(201).json({ purchase });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error purchasing standalone lesson' });
  }
};

// @route   GET /api/standalone-lessons/mine-purchased
// @access  Private (student)
export const getMyPurchasedStandaloneLessons = async (req, res) => {
  try {
    const purchases = await StandaloneLessonPurchase.find({ student: req.user.id })
      .populate({ path: 'lesson', select: '-videoUrl', populate: { path: 'relatedCourse', select: 'title' } })
      .sort({ createdAt: -1 });
    res.status(200).json({ purchases });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching your purchased lessons' });
  }
};

// ===== Admin =====

// @route   GET /api/standalone-lessons/pending
// @access  Private (admin/superadmin)
export const getPendingStandaloneLessons = async (req, res) => {
  try {
    const lessons = await StandaloneLesson.find({ status: 'pending' })
      .populate('instructor', 'name email')
      .populate('relatedCourse', 'title')
      .sort({ createdAt: 1 });
    res.status(200).json({ lessons });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching pending standalone lessons' });
  }
};

// @route   PATCH /api/standalone-lessons/:id/approve
// @access  Private (admin/superadmin)
export const approveStandaloneLesson = async (req, res) => {
  try {
    const lesson = await StandaloneLesson.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '', approvedBy: req.user.id },
      { new: true }
    );
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }
    await Notification.create({
      user: lesson.instructor,
      title: 'Standalone Lesson Approved',
      message: `Your standalone lesson "${lesson.title}" has been approved and is now purchasable.`,
      type: 'system',
    });
    res.status(200).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error approving standalone lesson' });
  }
};

// @route   PATCH /api/standalone-lessons/:id/reject
// @access  Private (admin/superadmin)
export const rejectStandaloneLesson = async (req, res) => {
  try {
    const { reason } = req.body;
    const lesson = await StandaloneLesson.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!lesson) {
      return res.status(404).json({ message: 'Standalone lesson not found' });
    }
    await Notification.create({
      user: lesson.instructor,
      title: 'Standalone Lesson Rejected',
      message: `Your standalone lesson "${lesson.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'system',
    });
    res.status(200).json({ lesson });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error rejecting standalone lesson' });
  }
};

// @route   GET /api/standalone-lessons/purchases/pending
// @access  Private (admin/superadmin)
export const getPendingStandaloneLessonPurchases = async (req, res) => {
  try {
    const purchases = await StandaloneLessonPurchase.find({ status: 'pending' })
      .populate('student', 'name email')
      .populate('lesson', 'title price')
      .sort({ createdAt: 1 });
    res.status(200).json({ purchases });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching pending purchases' });
  }
};

// @route   PATCH /api/standalone-lessons/purchases/:id/approve
// @access  Private (admin/superadmin)
export const approveStandaloneLessonPurchase = async (req, res) => {
  try {
    const purchase = await StandaloneLessonPurchase.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved' },
      { new: true }
    ).populate('lesson', 'title');
    if (!purchase) {
      const existing = await StandaloneLessonPurchase.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Purchase not found' });
      return res.status(409).json({ message: `Purchase already ${existing.status}` });
    }

    await Notification.create({
      user: purchase.student,
      title: 'Standalone Lesson Purchase Approved',
      message: `Your purchase of "${purchase.lesson?.title || 'a lesson'}" has been approved. You can now watch it.`,
      type: 'system',
    });

    res.status(200).json({ purchase });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error approving purchase' });
  }
};

// @route   PATCH /api/standalone-lessons/purchases/:id/reject
// @access  Private (admin/superadmin)
export const rejectStandaloneLessonPurchase = async (req, res) => {
  try {
    const { reason } = req.body;
    const purchase = await StandaloneLessonPurchase.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    ).populate('lesson', 'title');
    if (!purchase) {
      const existing = await StandaloneLessonPurchase.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Purchase not found' });
      return res.status(409).json({ message: `Purchase already ${existing.status}` });
    }

    await Notification.create({
      user: purchase.student,
      title: 'Standalone Lesson Purchase Rejected',
      message: `Your purchase request for "${purchase.lesson?.title || 'a lesson'}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'system',
    });

    res.status(200).json({ purchase });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error rejecting purchase' });
  }
};
