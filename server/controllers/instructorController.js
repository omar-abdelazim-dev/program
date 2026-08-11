import User from '../models/User.js';
import Course from '../models/Course.js';
import { attachReviewStats } from './courseController.js';
import Review from '../models/Review.js';
import Enrollment from '../models/Enrollment.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// Shared helper: given a list of instructor ObjectIds, compute
// { [instructorId]: { courseCount, avgRating, totalStudents, expertise } }
// from their *approved* courses only.
async function buildInstructorStats(instructorIds) {
  const courses = await Course.find({ instructor: { $in: instructorIds }, status: 'approved' }).select('_id instructor category');

  const courseIdsByInstructor = new Map();
  const categoriesByInstructor = new Map();
  for (const c of courses) {
    const key = c.instructor.toString();
    if (!courseIdsByInstructor.has(key)) courseIdsByInstructor.set(key, []);
    courseIdsByInstructor.get(key).push(c._id);

    if (!categoriesByInstructor.has(key)) categoriesByInstructor.set(key, new Set());
    if (c.category) categoriesByInstructor.get(key).add(c.category);
  }

  const allCourseIds = courses.map((c) => c._id);
  const [reviews, enrollments] = await Promise.all([
    Review.find({ course: { $in: allCourseIds } }).select('course rating'),
    Enrollment.find({ course: { $in: allCourseIds } }).select('course student'),
  ]);

  const courseToInstructor = new Map(courses.map((c) => [c._id.toString(), c.instructor.toString()]));

  const ratingsByInstructor = new Map();
  for (const r of reviews) {
    const key = courseToInstructor.get(r.course.toString());
    if (!key) continue;
    if (!ratingsByInstructor.has(key)) ratingsByInstructor.set(key, []);
    ratingsByInstructor.get(key).push(r.rating);
  }

  const studentsByInstructor = new Map();
  for (const e of enrollments) {
    const key = courseToInstructor.get(e.course.toString());
    if (!key) continue;
    if (!studentsByInstructor.has(key)) studentsByInstructor.set(key, new Set());
    studentsByInstructor.get(key).add(e.student.toString());
  }

  const stats = {};
  for (const id of instructorIds) {
    const key = id.toString();
    const ratings = ratingsByInstructor.get(key) || [];
    const avgRating = ratings.length
      ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
      : 0;

    stats[key] = {
      courseCount: (courseIdsByInstructor.get(key) || []).length,
      avgRating,
      totalReviews: ratings.length,
      totalStudents: (studentsByInstructor.get(key) || new Set()).size,
      expertise: Array.from(categoriesByInstructor.get(key) || []),
    };
  }
  return stats;
}

// @route   GET /api/instructors?search=
// @access  Public — feeds the Explore page's "Instructors" tab and search.
export const listInstructors = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { role: 'instructor', isDeleted: false, isBlocked: false };
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const instructors = await User.find(filter).select('name lastName avatarUrl goalsText isProgramInstructor');
    const stats = await buildInstructorStats(instructors.map((i) => i._id));

    const result = instructors.map((i) => ({
      id: i._id,
      name: i.name,
      lastName: i.lastName,
      avatarUrl: i.avatarUrl,
      bio: i.goalsText,
      isProgramInstructor: i.isProgramInstructor,
      ...stats[i._id.toString()],
    }));

    res.status(200).json({ instructors: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching instructors' });
  }
};

// @route   GET /api/instructors/:id
// @access  Public — instructor profile page.
export const getInstructorProfile = async (req, res) => {
  try {
    const instructor = await User.findOne({ _id: req.params.id, role: 'instructor', isDeleted: false });
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const rawCourses = await Course.find({ instructor: instructor._id, status: 'approved' })
      .populate('instructor', 'name avatarUrl isProgramInstructor')
      .sort({ createdAt: -1 });

    const [stats, courses] = await Promise.all([
      buildInstructorStats([instructor._id]),
      attachReviewStats(rawCourses),
    ]);

    res.status(200).json({
      instructor: {
        id: instructor._id,
        name: instructor.name,
        lastName: instructor.lastName,
        avatarUrl: instructor.avatarUrl,
        bio: instructor.goalsText,
        isProgramInstructor: instructor.isProgramInstructor,
        ...stats[instructor._id.toString()],
      },
      courses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching instructor profile' });
  }
};
