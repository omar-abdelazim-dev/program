import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Lesson from '../models/Lesson.js';
import PromoCode from '../models/PromoCode.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { logAudit } from '../utils/auditLogger.js';
import Notification from '../models/Notification.js';

// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalSuperAdmins = await User.countDocuments({ role: 'superadmin' });

    // Course Management tab header cards (ADM-05): Total Courses, Pending
    // Courses, Pending Lessons.
    const totalCourses = await Course.countDocuments();
    const pendingCourses = await Course.countDocuments({ status: 'pending' });
    const pendingLessons = await Lesson.countDocuments({ status: 'pending' });

    // Revenue total + per-category enrollment counts, computed in Mongo
    // instead of pulling every enrollment (with its populated course) into
    // app memory and looping in JS. $facet runs both aggregations in a
    // single round trip.
    const [statsAgg] = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      // preserveNullAndEmptyArrays: a course can be missing (e.g. deleted)
      // — revenue still counts that enrollment, categoryCounts must not.
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          revenue: [
            { $group: { _id: null, total: { $sum: { $ifNull: ['$amountPaid', 0] } } } },
          ],
          byCategory: [
            { $match: { 'course.category': { $exists: true, $ne: '' } } },
            { $group: { _id: '$course.category', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const totalRevenue = statsAgg.revenue[0]?.total || 0;
    const categoryCounts = {};
    statsAgg.byCategory.forEach((c) => {
      categoryCounts[c._id] = c.count;
    });

    // 30-day-over-30-day signup growth per role, for the trend badges on the
    // overview cards.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const getGrowth = async (role) => {
      const currentPeriod = await User.countDocuments({ role, createdAt: { $gte: thirtyDaysAgo } });
      const previousPeriod = await User.countDocuments({ role, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });

      if (previousPeriod === 0) {
        // If there were no users in the previous period, mathematically growth is infinite.
        // Showing 100% looks like hardcoded fake data to users, so we return 0.
        return 0; 
      }
      return Number((((currentPeriod - previousPeriod) / previousPeriod) * 100).toFixed(1));
    };

    const growth = {
      students: await getGrowth('student'),
      instructors: await getGrowth('instructor'),
      admins: await getGrowth('admin'),
      superAdmins: await getGrowth('superadmin'),
    };

    const platformCommission = 30;
    const companyShare = (totalRevenue * platformCommission) / 100;

    res.status(200).json({
      totalStudents,
      totalInstructors,
      totalAdmins,
      totalSuperAdmins,
      totalCourses,
      pendingCourses,
      pendingLessons,
      pendingLessonsCount: pendingLessons,
      totalRevenue,
      platformCommission,
      companyShare,
      categoryCounts,
      growth
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @route   GET /api/admin/revenue-analytics
// @access  Private (Admin)
// Real revenue + enrollment counts bucketed by month, for the last 12
// months — no commission split or payout math, just what was actually
// paid (Enrollment.amountPaid), aggregated in Mongo. Zero-filled so months
// with no enrollments still show up as a bar instead of a gap.
export const getRevenueAnalytics = async (req, res) => {
  try {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const monthly = await Enrollment.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: { $ifNull: ['$amountPaid', 0] } },
          enrollments: { $sum: 1 },
        },
      },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cursor = new Date(start);
    const series = [];
    for (let i = 0; i < 12; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const bucket = monthly.find((m) => m._id.year === year && m._id.month === month);
      series.push({
        label: monthNames[cursor.getMonth()],
        revenue: bucket?.revenue || 0,
        enrollments: bucket?.enrollments || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalRevenue = series.reduce((sum, m) => sum + m.revenue, 0);
    const totalEnrollments = series.reduce((sum, m) => sum + m.enrollments, 0);
    const avgOrderValue = totalEnrollments === 0 ? 0 : Math.round(totalRevenue / totalEnrollments);

    res.status(200).json({ series, totalRevenue, totalEnrollments, avgOrderValue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching revenue analytics' });
  }
};

// @route   GET /api/admin/activity
// @access  Private (Admin)
// Merges the most recent signups (admin/superadmin only), enrollments, and
// course submissions into a single reverse-chronological feed for the
// dashboard's "Recent Activity" tab.
export const getRecentActivity = async (req, res) => {
  try {
    const recentUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEnrollments = await Enrollment.find()
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentCourses = await Course.find()
      .populate('instructor', 'name isProgramInstructor')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [];

    recentUsers.forEach((u) => {
      activities.push({
        id: `usr_${u._id}`,
        type: 'user',
        title: `New ${u.role === 'superadmin' ? 'Super Admin' : 'Admin'} Added`,
        description: `Account created for ${u.name} (${u.email}).`,
        date: u.createdAt,
      });
    });

    recentEnrollments.forEach((e) => {
      activities.push({
        id: `enr_${e._id}`,
        type: 'enrollment',
        title: 'New Student Enrollment',
        description: `${e.student?.name || 'A student'} enrolled in '${e.course?.title || 'a course'}'.`,
        date: e.createdAt,
      });
    });

    recentCourses.forEach((c) => {
      let desc = `'${c.title}' was submitted by ${c.instructor?.name || 'an instructor'}.`;
      if (c.status === 'approved') {
        desc = `'${c.title}' by ${c.instructor?.name || 'an instructor'} was approved by ${c.approvedBy?.name || 'an admin'}.`;
      }
      
      activities.push({
        id: `crs_${c._id}`,
        type: 'course',
        title: c.status === 'approved' ? 'Course Approved' : 'Course Submitted',
        description: desc,
        date: c.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ activities: activities.slice(0, 10) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching activity' });
  }
};

// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const { search, page, limit, role, includeDeleted } = req.query;
    let query = {};

    // By default, hide soft-deleted users from admin lists.
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (role) query.role = role;

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // If neither page nor limit provided, keep existing behavior (return all results)
    if (page === undefined && limit === undefined) {
      const users = await User.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ users });
    }

    // Parse and validate pagination params
    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;

    const skip = (pageNum - 1) * limitNum;

    const [totalItems, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.status(200).json({ users, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// @route   PATCH /api/admin/users/:id/block
// @access  Private (Admin)
export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't let an admin block themselves easily
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Only a superadmin can block/unblock another admin or superadmin —
    // otherwise any admin could lock every other admin/superadmin out of
    // the platform (blocked users are rejected on every subsequent request).
    if ((user.role === 'admin' || user.role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can block or unblock an admin or superadmin' });
    }

    const previousState = user.isBlocked;
    user.isBlocked = !user.isBlocked;
    await user.save();

    // Audit the block/unblock action
    await logAudit({
      action: user.isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      module: 'admin',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warn',
      metadata: { targetEmail: user.email, targetRole: user.role, previousState },
    });

    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error blocking user' });
  }
};

const ASSIGNABLE_ROLES = ['student', 'instructor', 'admin'];

// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin, Superadmin)
// Unified role-change endpoint — replaces the old separate promote/demote
// actions. 'superadmin' is deliberately not an assignable role here: that
// tier stays untouchable through this endpoint in either direction, and a
// plain admin can't change another admin's role — only a superadmin can.
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot change a superadmin\'s role' });
    }

    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmins can change another admin\'s role' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Audit role change
    await logAudit({
      action: 'USER_ROLE_CHANGED',
      module: 'admin',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      oldValue: { role: previousRole },
      newValue: { role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warn',
      metadata: { targetEmail: user.email },
    });

    res.status(200).json({ message: `User's role changed to ${role}`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error changing user role' });
  }
};

// A user can't be suspended/deleted by anyone but a superadmin if they're an
// admin/superadmin themselves, and never by (or targeting) themselves —
// mirrors the existing toggleBlockUser / changeUserRole guards above.
const canModerate = (req, targetUser) => {
  if (!targetUser) return 'User not found';
  if (targetUser._id.toString() === req.user.id.toString()) return 'Cannot act on your own account';
  if (targetUser.role === 'superadmin') return 'Cannot act on a superadmin';
  if (targetUser.role === 'admin' && req.user.role !== 'superadmin') return 'Only a superadmin can act on an admin';
  return null;
};

// @route   DELETE /api/admin/users/:id/soft-delete
// @access  Private (Admin)
// Soft delete only — the record stays intact (Enrollment/Course references
// aren't touched) but the user is hidden from admin lists and can't log in.
export const softDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const err = canModerate(req, user);
    if (err) return res.status(user ? 400 : 404).json({ message: err });

    user.isDeleted = true;
    user.isBlocked = true;
    await user.save();

    // Audit soft delete
    await logAudit({
      action: 'USER_SOFT_DELETED',
      module: 'admin',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'error',
      metadata: { targetEmail: user.email, targetRole: user.role },
    });

    res.status(200).json({ message: 'User deleted', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

// @route   PATCH /api/admin/users/:id/restore
// @access  Private (Admin)
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isDeleted = false;
    user.isBlocked = false;
    await user.save();

    // Audit restore
    await logAudit({
      action: 'USER_RESTORED',
      module: 'admin',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      metadata: { targetEmail: user.email, targetRole: user.role },
    });

    res.status(200).json({ message: 'User restored', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error restoring user' });
  }
};

// @route   GET /api/admin/transactions
// @access  Private (Admin)
export const getTransactions = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // If neither page nor limit provided, keep existing behavior
    if (page === undefined && limit === undefined) {
      const enrollments = await Enrollment.find()
        .populate('student', 'name email phone')
        .populate({
          path: 'course',
          select: 'title price instructor',
          populate: { path: 'instructor', select: 'name' }
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({ transactions: enrollments });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, enrollments] = await Promise.all([
      Enrollment.countDocuments(),
      Enrollment.find()
        .populate('student', 'name email phone')
        .populate({
          path: 'course',
          select: 'title price instructor',
          populate: { path: 'instructor', select: 'name' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.status(200).json({ transactions: enrollments, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};


// @route   GET /api/admin/payouts
// @access  Private (Admin)
export const getPendingPayouts = async (req, res) => {
  try {
    const payouts = await Transaction.find({ type: 'payout_request' })
      .populate('instructor', 'name email phone isProgramInstructor')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ payouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching payouts' });
  }
};

// @route   GET /api/admin/lessons
// @access  Private (Admin/SuperAdmin)
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find()
      .populate({
        path: 'module',
        populate: {
          path: 'course',
          select: 'title instructor status category',
          populate: {
            path: 'instructor',
            select: 'name email',
          },
        },
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ message: 'Server error fetching lessons' });
  }
};

// @route   PATCH /api/admin/lessons/:id/approve
// @access  Private (Admin/SuperAdmin)
export const approveLesson = async (req, res) => {
  try {
    // Approved lessons start as draft — the instructor publishes them manually
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, { status: 'draft' }, { new: true });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.status(200).json({ message: 'Lesson approved', lesson });
  } catch (error) {
    console.error('Error approving lesson:', error);
    res.status(500).json({ message: 'Server error approving lesson' });
  }
};

// @route   PATCH /api/admin/lessons/:id/reject
// @access  Private (Admin/SuperAdmin)
export const rejectLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.status(200).json({ message: 'Lesson rejected', lesson });
  } catch (error) {
    console.error('Error rejecting lesson:', error);
    res.status(500).json({ message: 'Server error rejecting lesson' });
  }
};

// @route   POST /api/admin/enroll
// @access  Private (Admin/SuperAdmin)
// Manually enrolls a student in a course (e.g. comping access, resolving a
// support ticket). No money changes hands, so the financial fields stay 0
// rather than reusing the paid-enrollment commission-split logic.
export const manualEnroll = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ message: 'studentId and courseId are required' });
    }

    const [student, course] = await Promise.all([User.findById(studentId), Course.findById(courseId)]);

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      amountPaid: 0,
      platformCommission: 0,
      instructorShare: 0,
    });

    await logAudit({
      action: 'MANUAL_ENROLLMENT',
      module: 'admin',
      userId: req.user.id,
      targetId: enrollment._id,
      targetModel: 'Enrollment',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      metadata: { studentEmail: student.email, courseTitle: course.title },
    });

    res.status(201).json({ message: 'Student manually enrolled', enrollment });
  } catch (error) {
    // Duplicate-key error (code 11000): the unique student+course index
    // caught it — same friendly message as the student-facing enroll route.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Student is already enrolled in this course' });
    }
    console.error('Error manually enrolling student:', error);
    res.status(500).json({ message: 'Server error enrolling student' });
  }
};

// @route   POST /api/admin/promo-codes
// @access  Private (Admin/SuperAdmin) — issues an affiliate/promo code
// (ADM-13) tied to a specific (typically non-program) instructor.
export const createPromoCode = async (req, res) => {
  try {
    const { code, instructorId } = req.body;
    if (!code || !instructorId) {
      return res.status(400).json({ message: 'code and instructorId are required' });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const promo = await PromoCode.create({ code: code.toUpperCase().trim(), instructor: instructorId });
    res.status(201).json({ message: 'Promo code created', promo });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That promo code already exists' });
    }
    console.error('Error creating promo code:', error);
    res.status(500).json({ message: 'Server error creating promo code' });
  }
};

// @route   GET /api/admin/promo-codes
// @access  Private (Admin/SuperAdmin)
export const getPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().populate('instructor', 'name email isProgramInstructor').sort({ createdAt: -1 });
    res.status(200).json({ promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ message: 'Server error fetching promo codes' });
  }
};

// @route   PATCH /api/admin/promo-codes/:id/toggle
// @access  Private (Admin/SuperAdmin)
export const togglePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    promo.active = !promo.active;
    await promo.save();

    res.status(200).json({ message: `Promo code ${promo.active ? 'activated' : 'deactivated'}`, promo });
  } catch (error) {
    console.error('Error toggling promo code:', error);
    res.status(500).json({ message: 'Server error toggling promo code' });
  }
};

export const toggleProgramInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'instructor') {
      return res.status(400).json({ message: 'Only instructors can be program instructors' });
    }
    
    user.isProgramInstructor = !user.isProgramInstructor;
    await user.save();

    await logAudit({
      action: user.isProgramInstructor ? 'PROGRAM_INSTRUCTOR_ADDED' : 'PROGRAM_INSTRUCTOR_REMOVED',
      module: 'admin',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warn',
      metadata: { targetEmail: user.email },
    });

    res.json({ message: `Instructor ${user.isProgramInstructor ? 'added to' : 'removed from'} program`, user });
  } catch (error) {
    console.error('Error toggling program instructor:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @route   PATCH /api/admin/enrollments/:id/approve
// @access  Private (Admin/SuperAdmin)
export const approveEnrollment = async (req, res) => {
  try {
    // Atomic find-and-update on status: 'pending' closes the race window
    // between two concurrent approve calls (e.g. a double-click) — only the
    // first one can ever flip status away from 'pending', so at most one
    // revenue-split Transaction is ever created per enrollment.
    const enrollment = await Enrollment.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved' },
      { new: true }
    );
    if (!enrollment) {
      const existing = await Enrollment.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Enrollment request not found' });
      return res.status(409).json({ message: `Enrollment request already ${existing.status}` });
    }

    // Generate revenue split transaction for the instructor (if course has price)
    const course = await Course.findById(enrollment.course);
    if (course && course.price > 0 && course.instructor) {
      let platformCommission = enrollment.platformCommission;
      let instructorShare = enrollment.instructorShare;
      let commissionPercent = 15;
      
      const instructor = await User.findById(course.instructor);
      if (instructor && instructor.isProgramInstructor) {
        commissionPercent = 15;
      } else {
        commissionPercent = Math.round((platformCommission / course.price) * 100) || 15;
      }

      await Transaction.create({
        instructor: course.instructor,
        amount: instructorShare,
        type: 'course_sale',
        status: 'cleared',
        description: `Course Sale - ${course.title}`,
        course: course._id,
        commissionRate: commissionPercent,
      });
    }

    // Remove the admin-side enrollment request notifications
    await Notification.deleteMany({ refId: enrollment._id, title: 'New Enrollment Request' });

    // Notify the student
    await Notification.create({
      user: enrollment.student,
      title: 'Enrollment Request Approved',
      message: `Your enrollment request for "${course?.title || 'Course'}" has been approved! You can start learning now.`,
      type: 'system',
      link: `/learn/${enrollment.course}`
    });

    res.status(200).json({ message: 'Enrollment request approved', enrollment });
  } catch (error) {
    console.error('Error approving enrollment:', error);
    res.status(500).json({ message: 'Server error approving enrollment' });
  }
};

// @route   PATCH /api/admin/enrollments/:id/reject
// @access  Private (Admin/SuperAdmin)
export const rejectEnrollment = async (req, res) => {
  try {
    const { reason } = req.body;
    // Same atomic guard as approveEnrollment — see comment there.
    const enrollment = await Enrollment.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );
    if (!enrollment) {
      const existing = await Enrollment.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Enrollment request not found' });
      return res.status(409).json({ message: `Enrollment request already ${existing.status}` });
    }

    await enrollment.populate('course');

    // Remove the admin-side enrollment request notifications
    await Notification.deleteMany({ refId: enrollment._id, title: 'New Enrollment Request' });

    // Notify the student
    await Notification.create({
      user: enrollment.student,
      title: 'Enrollment Request Rejected',
      message: `Your enrollment request for "${enrollment.course?.title || 'Course'}" was rejected. Reason: ${reason || 'No reason provided.'}`,
      type: 'system',
      link: `/courses/${enrollment.course?._id || enrollment.course}`
    });

    res.status(200).json({ message: 'Enrollment request rejected', enrollment });
  } catch (error) {
    console.error('Error rejecting enrollment:', error);
    res.status(500).json({ message: 'Server error rejecting enrollment' });
  }
};
