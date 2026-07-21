import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import mongoose from 'mongoose';

// @route   POST /api/courses
// @access  Private (instructor only)
export const createCourse = async (req, res) => {
  try {
    const { title, description, price, category, thumbnailUrl } = req.body;

    if (!title || !description || price === undefined || !category) {
      return res.status(400).json({ message: 'Title, description, price, and category are required' });
    }

    const course = await Course.create({
      title,
      description,
      price,
      category,
      thumbnailUrl: thumbnailUrl || '',
      instructor: req.user.id, // taken from the verified JWT, never trust a client-sent instructor ID
      status: 'pending', // every new course starts pending — never trust the client to set this either
    });

    res.status(201).json({ course });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating course' });
  }
};

// @route   GET /api/courses/mine
// @access  Private (instructor only) — shows ALL of the instructor's own
// courses regardless of status, so they can see pending/rejected ones too.
export const getMyCourses = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const baseQuery = { instructor: req.user.id };

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(baseQuery).sort({ createdAt: -1 });
      return res.status(200).json({ courses });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(baseQuery),
      Course.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({ courses, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching your courses' });
  }
};

// @route   GET /api/courses/stats
// @access  Private (instructor only)
export const getInstructorStats = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.user.id);
    
    // Aggregation for course-level stats
    const stats = await Course.aggregate([
      { $match: { instructor: instructorId } },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      {
        $lookup: {
          from: 'lessons',
          localField: '_id',
          foreignField: 'course',
          as: 'lessons'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          totalEnrolled: { $size: '$enrollments' },
          totalRevenue: { $sum: '$enrollments.amountPaid' },
          lessonsCount: { $size: '$lessons' },
          totalCompletions: {
            $sum: {
              $map: {
                input: '$enrollments',
                as: 'en',
                in: { $size: '$$en.completedLessons' }
              }
            }
          }
        }
      }
    ]);

    // Format stats and compute completion rate
    const courseStats = stats.map(course => {
      let completionRate = 0;
      if (course.totalEnrolled > 0 && course.lessonsCount > 0) {
        const totalPossibleCompletions = course.totalEnrolled * course.lessonsCount;
        completionRate = Math.round((course.totalCompletions / totalPossibleCompletions) * 100);
      }
      return {
        id: course._id,
        title: course.title,
        enrolled: course.totalEnrolled,
        revenue: course.totalRevenue,
        completionRate: `${completionRate}%`
      };
    });

    // Aggregation for time-series charts (revenue and student growth)
    const timeSeries = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseDoc'
        }
      },
      { $unwind: '$courseDoc' },
      { $match: { 'courseDoc.instructor': instructorId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amountPaid' },
          students: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create base skeleton for the last 7 months to ensure continuous charts
    const fullTimeSeries = [];
    const currentDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      fullTimeSeries.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        name: monthNames[d.getMonth()],
        revenue: 0,
        students: 0
      });
    }

    // Merge actual data into skeleton
    timeSeries.forEach(ts => {
      const match = fullTimeSeries.find(f => f.year === ts._id.year && f.month === ts._id.month);
      if (match) {
        match.revenue = ts.revenue;
        match.students = ts.students;
      }
    });

    res.status(200).json({ courseStats, timeSeriesData: fullTimeSeries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @route   GET /api/courses
// @access  Public — the student-facing catalog. Only ever returns approved
// courses; pending/rejected courses must never leak here.
export const getApprovedCourses = async (req, res) => {
  try {
    const { search, category, page, limit } = req.query;

    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' }; // simple case-insensitive title search

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(filter)
        .populate('instructor', 'name') // include instructor's name, nothing more sensitive
        .sort({ createdAt: -1 });

      return res.status(200).json({ courses });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate('instructor', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({ courses, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching courses' });
  }
};

// @route   GET /api/courses/:id
// @access  Public (for approved courses) — used on the course details page.
// Also allows the owning instructor or an admin to view a non-approved course.
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isOwner = req.user && course.instructor._id.toString() === req.user.id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (course.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(403).json({ message: 'This course is not yet available' });
    }

    const lessons = await Lesson.find({ course: course._id })
      .select('title order') // deliberately excludes videoUrl — see getLessonContent for the gated endpoint
      .sort({ order: 1 });

    res.status(200).json({ course, lessons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching course' });
  }
};

// @route   GET /api/courses/pending
// @access  Private (admin only)
export const getPendingCourses = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const filter = { status: 'pending' };

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(filter)
        .populate('instructor', 'name email')
        .sort({ createdAt: 1 }); // oldest first — first submitted, first reviewed

      return res.status(200).json({ courses });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate('instructor', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({ courses, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching pending courses' });
  }
};

// @route   PATCH /api/courses/:id/approve
// @access  Private (admin only)
export const approveCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '', approvedBy: req.user.id },
      { new: true } // return the updated document, not the pre-update one
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ course });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error approving course' });
  }
};

// @route   PATCH /api/courses/:id/reject
// @access  Private (admin only)
export const rejectCourse = async (req, res) => {
  try {
    const { reason } = req.body;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || '' },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ course });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error rejecting course' });
  }
};
