import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Lesson from '../models/Lesson.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalSuperAdmins = await User.countDocuments({ role: 'superadmin' });

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

      if (previousPeriod === 0) return currentPeriod > 0 ? 100 : 0;
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
      .populate('instructor', 'name')
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

    user.isBlocked = !user.isBlocked;
    await user.save();

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

    user.role = role;
    await user.save();

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
        .populate('course', 'title price')
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
        .populate('course', 'title price')
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
      .populate('instructor', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ payouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching payouts' });
  }
};
