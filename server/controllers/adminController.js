import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
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

    res.status(200).json({
      totalStudents,
      totalInstructors,
      totalAdmins,
      totalSuperAdmins,
      totalRevenue,
      categoryCounts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    let query = {};
    
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      };
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
