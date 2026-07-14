import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';

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
    res.status(500).json({ message: 'Server error creating course', error: error.message });
  }
};

// @route   GET /api/courses/mine
// @access  Private (instructor only) — shows ALL of the instructor's own
// courses regardless of status, so they can see pending/rejected ones too.
export const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching your courses', error: error.message });
  }
};

// @route   GET /api/courses
// @access  Public — the student-facing catalog. Only ever returns approved
// courses; pending/rejected courses must never leak here.
export const getApprovedCourses = async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' }; // simple case-insensitive title search

    const courses = await Course.find(filter)
      .populate('instructor', 'name') // include instructor's name, nothing more sensitive
      .sort({ createdAt: -1 });

    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching courses', error: error.message });
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
    res.status(500).json({ message: 'Server error fetching course', error: error.message });
  }
};

// @route   GET /api/courses/pending
// @access  Private (admin only)
export const getPendingCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'pending' })
      .populate('instructor', 'name email')
      .sort({ createdAt: 1 }); // oldest first — first submitted, first reviewed

    res.status(200).json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching pending courses', error: error.message });
  }
};

// @route   PATCH /api/courses/:id/approve
// @access  Private (admin only)
export const approveCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true } // return the updated document, not the pre-update one
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ course });
  } catch (error) {
    res.status(500).json({ message: 'Server error approving course', error: error.message });
  }
};

// @route   PATCH /api/courses/:id/reject
// @access  Private (admin only)
export const rejectCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ course });
  } catch (error) {
    res.status(500).json({ message: 'Server error rejecting course', error: error.message });
  }
};
