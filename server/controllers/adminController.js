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

    // Calculate total revenue and enrollments by category
    const enrollments = await Enrollment.find().populate('course');
    let totalRevenue = 0;
    const categoryCounts = {};

    enrollments.forEach(enr => {
      totalRevenue += enr.amountPaid || 0;
      if (enr.course && enr.course.category) {
        const cat = enr.course.category;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });

    res.status(200).json({
      totalStudents,
      totalInstructors,
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
    const { search } = req.query;
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

    const users = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json({ users });
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
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error blocking user' });
  }
};

// @route   PATCH /api/admin/users/:id/demote
// @access  Private (Admin)
export const demoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }

    user.role = 'student';
    await user.save();

    res.status(200).json({ message: 'User demoted to student', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error demoting user' });
  }
};

// @route   GET /api/admin/transactions
// @access  Private (Admin)
export const getTransactions = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('student', 'name email phone')
      .populate('course', 'title price')
      .sort({ createdAt: -1 });

    res.status(200).json({ transactions: enrollments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};
