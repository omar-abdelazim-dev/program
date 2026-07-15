import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @route   POST /api/courses/:courseId/lessons
// @access  Private (instructor only, must own the course)
export const addLesson = async (req, res) => {
  try {
    const { title, videoUrl } = req.body;
    const { courseId } = req.params;

    if (!title || !videoUrl) {
      return res.status(400).json({ message: 'Title and video URL are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Ownership check: an instructor can only add lessons to their own courses.
    // Without this, any logged-in instructor could add lessons to anyone's course.
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You do not own this course' });
    }

    // Auto-number the lesson based on how many already exist, so the
    // instructor never has to think about ordering manually.
    const existingCount = await Lesson.countDocuments({ course: courseId });

    const lesson = await Lesson.create({
      title,
      videoUrl,
      course: courseId,
      order: existingCount + 1,
    });

    res.status(201).json({ lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding lesson' });
  }
};

// @route   GET /api/courses/:courseId/lessons/:lessonId
// @access  Private — this is the endpoint that actually returns the video URL.
// The public course-details endpoint deliberately does NOT include videoUrl
// (see courseController.getCourseById), so watching a lesson requires being
// enrolled (students), owning the course (instructor), or being an admin.
export const getLessonContent = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isOwner = course.instructor.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
      if (!enrollment) {
        return res.status(403).json({ message: 'Enroll in this course to watch its lessons' });
      }
    }

    const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    res.status(200).json({ lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching lesson' });
  }
};
