import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import ModulePurchase from '../models/ModulePurchase.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { isCourseContentLocked } from '../utils/courseContent.js';
import { validateManualPaymentProof } from '../utils/manualPayment.js';
import { getInternalConfig } from '../utils/configFetcher.js';

// @route   POST /api/courses/:courseId/modules
// @access  Private (instructor only, must own the course)
export const createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, price } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Module title is required' });
    }

    const course = await Course.findById(courseId).select('courseType status');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (isCourseContentLocked(course)) {
      return res.status(403).json({ message: 'This course is published and locked — Full Courses cannot be modified after publishing.' });
    }

    let modulePrice = 0;
    if (course.courseType === 'ongoing') {
      modulePrice = Number(price);
      if (!Number.isFinite(modulePrice) || modulePrice < 50 || modulePrice > 200) {
        return res.status(400).json({ message: 'Ongoing course module price must be between 50 EGP and 200 EGP.' });
      }
    }

    const existingCount = await Module.countDocuments({ course: courseId });

    const module = await Module.create({
      course: courseId,
      title,
      description: description || '',
      order: existingCount + 1,
      status: 'published',
      price: modulePrice,
    });

    res.status(201).json({ module: { ...module.toObject(), lessons: [] } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating module' });
  }
};

// @route   PUT /api/courses/:courseId/modules/:moduleId
// @access  Private (instructor only, must own the course)
export const updateModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description, price } = req.body;

    const course = await Course.findById(courseId).select('courseType status');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    if (title) module.title = title;
    if (description !== undefined) module.description = description;

    if (course.courseType === 'ongoing' && price !== undefined) {
      const modulePrice = Number(price);
      if (!Number.isFinite(modulePrice) || modulePrice < 50 || modulePrice > 200) {
        return res.status(400).json({ message: 'Ongoing course module price must be between 50 EGP and 200 EGP.' });
      }
      module.price = modulePrice;
    }

    await module.save();

    res.status(200).json({ module });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating module' });
  }
};

// @route   DELETE /api/courses/:courseId/modules/:moduleId
// @access  Private (instructor only, must own the course)
export const deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    await Lesson.deleteMany({ module: module._id });
    await module.deleteOne();

    // Re-number remaining modules so there are no gaps
    const remaining = await Module.find({ course: courseId }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.status(200).json({ message: 'Module deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting module' });
  }
};

// @route   PUT /api/courses/:courseId/modules-reorder
// @access  Private (instructor only, must own the course)
export const reorderModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({ message: 'moduleIds array is required' });
    }

    const existing = await Module.find({ course: courseId }).select('_id');
    const existingIds = new Set(existing.map((m) => m._id.toString()));

    if (moduleIds.length !== existingIds.size || !moduleIds.every((id) => existingIds.has(id))) {
      return res.status(400).json({ message: 'moduleIds must exactly match this course\'s modules' });
    }

    await Module.bulkWrite(
      moduleIds.map((id, i) => ({
        updateOne: { filter: { _id: id, course: courseId }, update: { order: i + 1 } },
      }))
    );

    res.status(200).json({ message: 'Modules reordered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error reordering modules' });
  }
};

// @route   POST /api/courses/:courseId/modules/:moduleId/purchase
// @access  Private (student)
export const purchaseModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    const existing = await ModulePurchase.findOne({ student: req.user.id, module: module._id });
    if (existing) {
      return res.status(409).json({ message: 'You have already purchased this module' });
    }

    let paymentProof = {};
    const { getDiscountQuote } = await import('./enrollmentController.js');
    let quote = null;
    if (module.price > 0 && req.body.discountCode) {
      quote = await getDiscountQuote({ price: module.price }, req.body.discountCode);
      if (!quote) {
        return res.status(400).json({ message: 'Code not valid' });
      }
    }
    const finalPrice = quote ? quote.finalPrice : module.price;

    if (finalPrice > 0) {
      const validation = validateManualPaymentProof(req.body);
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }
      paymentProof = validation.proof;
    }

    const instructor = await User.findById(course.instructor);
    let platformCommission = 0;
    let instructorShare = 0;
    if (instructor && instructor.isProgramInstructor) {
      instructorShare = finalPrice * 0.85;
      platformCommission = finalPrice * 0.15;
    } else {
      const config = await getInternalConfig();
      const commissionPercent = config?.financial?.commission ?? 15;
      platformCommission = (finalPrice * commissionPercent) / 100;
      instructorShare = finalPrice - platformCommission;
    }

    const status = finalPrice > 0 ? 'pending' : 'approved';
    const purchase = await ModulePurchase.create({
      student: req.user.id,
      module: module._id,
      course: courseId,
      amountPaid: finalPrice,
      platformCommission,
      instructorShare,
      status,
      ...paymentProof,
    });

    if (status === 'pending') {
      try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id');
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            type: 'admin',
            title: 'New Module Purchase',
            message: `Student submitted purchase for module "${module.title}" in course "${course.title}".`,
            link: '/admin',
          });
        }
      } catch (err) {
        logger.error('Failed to notify admins of module purchase', { error: err.message });
      }
    }

    res.status(201).json({ purchase });
  } catch (error) {
    logger.error('Server error purchasing module', { error: error.message });
    res.status(500).json({ message: 'Server error purchasing module' });
  }
};

// @route   GET /api/courses/:courseId/modules/mine-purchased
// @access  Private (student)
export const getMyPurchasedModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const purchases = await ModulePurchase.find({
      student: req.user.id,
      course: courseId,
      status: { $in: ['approved', 'pending', 'under_review'] },
    }).select('module status');
    
    const purchasedModuleIds = purchases
      .filter((p) => p.status === 'approved')
      .map((p) => p.module.toString());
      
    const pendingModuleIds = purchases
      .filter((p) => p.status === 'pending' || p.status === 'under_review')
      .map((p) => p.module.toString());
      
    res.status(200).json({ purchasedModuleIds, pendingModuleIds });
  } catch (error) {
    logger.error('Server error fetching purchased modules', { error: error.message });
    res.status(500).json({ message: 'Server error fetching purchased modules' });
  }
};

