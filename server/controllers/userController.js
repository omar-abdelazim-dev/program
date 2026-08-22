import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import logger from '../utils/logger.js';

// @route   GET /api/users/:id/profile
// @access  Private — only an instructor, an admin, or the user themselves
// can view the full profile detail (STU-07); everyone else is denied rather
// than served a redacted version, since this isn't a public directory.
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const isSelf = req.user.id.toString() === id;
    const isPrivileged = ['instructor', 'admin', 'superadmin'].includes(req.user.role);
    if (!isSelf && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    const user = await User.findOne({ _id: id, isDeleted: false }).select(
      'name lastName avatarUrl role college major academicType academicGroup university goalsText'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      profile: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        college: user.college,
        major: user.major,
        academicType: user.academicType,
        academicGroup: user.academicGroup,
        university: user.university,
        bio: user.goalsText,
      },
    });
  } catch (error) {
    logger.error('Error fetching user profile:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// @route   GET /api/users/:id/enrollments
// @access  Private — only an instructor, an admin, or the user themselves
export const getStudentEnrollments = async (req, res) => {
  try {
    const { id } = req.params;

    const isSelf = req.user.id.toString() === id;
    const isPrivileged = ['instructor', 'admin', 'superadmin'].includes(req.user.role);
    if (!isSelf && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }

    const enrollments = await Enrollment.find({ student: id })
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name avatarUrl isProgramInstructor' },
        select: 'title thumbnailUrl instructor price discountedPrice averageRating reviewsCount category',
      })
      .sort({ updatedAt: -1 });

    // Filter out enrollments where the course was deleted
    const courses = enrollments
      .filter(e => e.course)
      .map(e => (e.course.toObject ? e.course.toObject() : e.course));

    res.status(200).json({ courses });
  } catch (error) {
    logger.error('Error fetching student enrollments:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching student enrollments' });
  }
};
