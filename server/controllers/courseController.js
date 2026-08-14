import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getModulesWithLessons, getLessonIdsForCourse } from '../utils/courseContent.js';
import mongoose from 'mongoose';
import fs from 'fs';
import logger from '../utils/logger.js';

// Helper: attach averageRating and reviewsCount to an array of course docs
export const attachReviewStats = async (courses) => {
  const courseIds = courses.map(c => c._id);
  const stats = await Review.aggregate([
    { $match: { course: { $in: courseIds } } },
    { $group: { _id: '$course', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const statsMap = {};
  stats.forEach(s => { statsMap[s._id.toString()] = { avg: parseFloat(s.avg.toFixed(1)), count: s.count }; });
  return courses.map(c => {
    const obj = c.toObject ? c.toObject() : { ...c };
    const s = statsMap[obj._id.toString()];
    obj.averageRating = s ? s.avg : 0;
    obj.reviewsCount = s ? s.count : 0;
    return obj;
  });
};

// @route   POST /api/courses
// @access  Private (instructor only)
// title/description/price are validated by validateCreateCourse before this
// runs; category is optional (INS-03 de-required it in favor of college).
export const createCourse = async (req, res) => {
  try {
    const { title, description, price, category, major, semester, college, thumbnailUrl } = req.body;



    const course = await Course.create({
      title,
      description,
      price,
      category: category || '',
      major: major || '',
      semester: semester !== undefined && semester !== '' ? semester : undefined,
      college: college || '',
      thumbnailUrl: thumbnailUrl || '',
      instructor: req.user.id, // taken from the verified JWT, never trust a client-sent instructor ID
      status: 'pending', // every new course starts pending — never trust the client to set this either
    });

    res.status(201).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
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
    logger.error('An error occurred', { error: error.message, stack: error.stack });
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
          from: 'modules',
          localField: '_id',
          foreignField: 'course',
          as: 'modules'
        }
      },
      {
        $lookup: {
          from: 'lessons',
          localField: 'modules._id',
          foreignField: 'module',
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
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @route   GET /api/courses
// @access  Public — the student-facing catalog. Only ever returns approved
// courses; pending/rejected courses must never leak here.
export const getApprovedCourses = async (req, res) => {
  try {
    const { search, category, major, semester, college, page, limit } = req.query;

    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (major) filter.major = major;
    if (semester) filter.semester = parseInt(semester, 10);
    if (college) filter.college = college;

    if (search) {
      // Match either the course title or the instructor's name — lets the
      // Explore search bar cover both course and instructor lookups.
      const regex = { $regex: escapeRegex(search), $options: 'i' };
      const matchingInstructors = await mongoose.model('User').find({ name: regex }).select('_id');
      filter.$or = [
        { title: regex },
        { instructor: { $in: matchingInstructors.map((u) => u._id) } },
      ];
    }

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(filter)
        .populate('instructor', 'name avatarUrl isProgramInstructor') // include instructor's name + avatar, nothing more sensitive
        .sort({ createdAt: -1 });

      // Attach review stats to each course
      const coursesWithReviews = await attachReviewStats(courses);
      return res.status(200).json({ courses: coursesWithReviews });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate('instructor', 'name avatarUrl isProgramInstructor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    // Attach review stats to each course
    const coursesWithReviews = await attachReviewStats(courses);
    res.status(200).json({ courses: coursesWithReviews, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching courses' });
  }
};

// @route   GET /api/courses/:id
// @access  Public (for approved courses) — used on the course details page.
// Also allows the owning instructor or an admin to view a non-approved course.
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name isProgramInstructor');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isOwner = req.user && course.instructor._id.toString() === req.user.id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    const isEnrolled = req.user ? await Enrollment.exists({ $or: [{ student: req.user.id }, { user: req.user.id }], course: course._id }) : false;

    if (course.status !== 'approved' && !isOwner && !isAdmin && !isEnrolled) {
      if (course.status === 'suspended') {
        return res.status(403).json({ message: 'This course has been suspended by administration.' });
      }
      return res.status(403).json({ message: 'This course is not yet available.' });
    }

    // deliberately excludes videoUrl and quiz content (question text/correct
    // answers) — see getLessonContent for the gated endpoint that returns those
    const grouped = await getModulesWithLessons(course._id, 'title order module status lessonType');
    const modules = grouped.map(({ module, lessons }) => ({
      _id: module._id,
      title: module.title,
      description: module.description,
      order: module.order,
      lessons,
    }));

    res.status(200).json({ course, modules });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
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
        .populate('instructor', 'name email isProgramInstructor')
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
        .populate('instructor', 'name email isProgramInstructor')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({ courses, pagination: { page: pageNum, limit: limitNum, totalPages, totalItems } });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching pending courses' });
  }
};

// @route   PATCH /api/courses/:id/approve
// @access  Private (admin only)
export const approveCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'draft', rejectionReason: '', approvedBy: req.user.id },
      { new: true } // return the updated document, not the pre-update one
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Send notification to instructor
    await Notification.create({
      user: course.instructor,
      title: 'Course Approved',
      message: `Your course "${course.title}" has been approved! It is now saved as a Draft. You can publish it to go live whenever you are ready.`,
      type: 'system'
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error approving course' });
  }
};

// @route   PATCH /api/courses/:id/publish
// @access  Private (instructor only)
export const publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to control this course' });
    }

    if (course.status === 'draft') {
      const lessonIds = await getLessonIdsForCourse(course._id);
      if (lessonIds.length === 0) {
        return res.status(400).json({ message: 'Add at least one lesson before publishing this course live' });
      }
      course.status = 'approved';
    } else if (course.status === 'approved') {
      course.status = 'draft';
    } else {
      return res.status(400).json({ message: 'Course must be approved before you can publish it live' });
    }

    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error toggling course live status' });
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
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error rejecting course' });
  }
};

// @route   PUT /api/courses/:id
// @access  Private (owning instructor, or admin/superadmin for compliance edits)
// price is intentionally never read from req.body here (INS-05) — once a
// course is submitted, price can only change... it can't; it's fixed at
// creation. Any price field sent in the request body is silently ignored,
// both in the UI (which no longer renders the field) and here at the API
// level, so the restriction can't be bypassed by calling the API directly.
export const updateCourse = async (req, res) => {
  try {
    const { title, description, category, major, semester, college, thumbnailUrl } = req.body;

    const course = req.resource; // Provided by verifyOwnership middleware

    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    if (major !== undefined) course.major = major;
    if (semester !== undefined) course.semester = semester === '' ? undefined : semester;
    if (college !== undefined) course.college = college;
    if (thumbnailUrl !== undefined) {
      course.thumbnailUrl = thumbnailUrl;
    }
    // Optional: reset status to pending when heavily edited
    // course.status = 'pending';

    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error updating course' });
  }
};

// @route   GET /api/courses/:id/enrollments
// @access  Private (admin/superadmin) — lets the Course Management tab show
// who's enrolled in an already-approved course.
export const getCourseEnrollments = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrollments = await Enrollment.find({ course: course._id })
      .populate('student', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ enrollments });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching course enrollments' });
  }
};

// @route   PATCH /api/courses/:id/unpublish
// @access  Private (admin/superadmin) — pulls a previously-approved course
// out of the public catalog without deleting it; approveCourse can bring it
// back later.
export const unpublishCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { status: 'unpublished' }, { new: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error unpublishing course' });
  }
};

// @route   PATCH /api/courses/:id/suspend
// @access  Private (admin/superadmin)
export const suspendCourse = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Suspension reason is required' });
    }

    const course = await Course.findByIdAndUpdate(req.params.id, { status: 'suspended', rejectionReason: reason }, { new: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Send notification to instructor
    await Notification.create({
      user: course.instructor,
      title: 'Course Suspended',
      message: `Your course "${course.title}" has been suspended. You can republish your course by clicking on the course card after resolving the suspended reason. Reason: ${reason}`,
      type: 'system'
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error suspending course' });
  }
};

// @route   PATCH /api/courses/:id/republish
// @access  Private (instructor only)
export const republishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to republish this course' });
    }
    if (course.status !== 'suspended' && course.status !== 'rejected') {
      return res.status(400).json({ message: 'Only suspended or rejected courses can be republished' });
    }

    course.status = 'pending';
    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error republishing course' });
  }
};

// @route   DELETE /api/courses/:id
// @access  Private (admin/superadmin only) — instructors can no longer delete
// a course directly; they request deletion (see requestDeleteCourse) and an
// admin performs the actual delete after review.
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Cleanup associated lessons and modules. Lessons are keyed off
    // Module, not Course directly, so modules must be resolved first.
    const modules = await Module.find({ course: course._id });
    const moduleIds = modules.map((m) => m._id);
    await Lesson.deleteMany({ module: { $in: moduleIds } });
    await Module.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(req.params.id);
    // Enrollments generally shouldn't be deleted so students maintain history,
    // or they could be depending on business logic. We'll leave them or soft-delete.

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error deleting course' });
  }
};

// @route   PATCH /api/courses/:id/request-delete
// @access  Private (instructor only, must own the course)
export const requestDeleteCourse = async (req, res) => {
  try {
    const course = req.resource; // Provided by verifyOwnership middleware

    if (course.deletionRequested) {
      return res.status(409).json({ message: 'Deletion has already been requested for this course' });
    }

    course.deletionRequested = true;
    await course.save();

    res.status(200).json({ message: 'Deletion request submitted for admin review', course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error requesting course deletion' });
  }
};

// @route   GET /api/courses/deletion-requests
// @access  Private (admin/superadmin) — feeds the Course Management tab's
// deletion-request review queue.
export const getDeletionRequests = async (req, res) => {
  try {
    const courses = await Course.find({ deletionRequested: true })
      .populate('instructor', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({ courses });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error fetching deletion requests' });
  }
};

// @route   PATCH /api/courses/:id/reject-deletion
// @access  Private (admin/superadmin) — admin declines the request; the
// course stays live and the instructor can request again later if needed.
export const rejectDeletionRequest = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { deletionRequested: false }, { new: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Deletion request rejected', course });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error rejecting deletion request' });
  }
};
