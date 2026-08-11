import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Section from '../models/Section.js';

// @route   POST /api/courses/:courseId/lessons
// @access  Private (instructor only, must own the course)
export const addLesson = async (req, res) => {
  try {
    const { title, videoUrl, attachmentUrl, attachmentTitle } = req.body;
    const { courseId } = req.params;

    if (!title || !videoUrl) {
      return res.status(400).json({ message: 'Title and video URL are required' });
    }

    const course = req.resource; // Provided by verifyOwnership middleware

    // Backward compatibility: Find or create a default section for this course
    let section = await Section.findOne({ course: courseId }).sort({ order: 1 });
    if (!section) {
      section = await Section.create({
        course: courseId,
        title: 'Course Content',
        order: 1,
        status: 'published'
      });
    }

    const existingCount = await Lesson.countDocuments({ section: section._id });

    const lesson = await Lesson.create({
      title,
      videoUrl,
      attachmentUrl: attachmentUrl || '',
      attachmentTitle: attachmentTitle || '',
      section: section._id,
      order: existingCount + 1,
      status: 'pending'
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
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      const enrollment = await Enrollment.findOne({ $or: [{ student: req.user.id }, { user: req.user.id }], course: courseId });
      if (!enrollment) {
        return res.status(403).json({ message: 'Enroll in this course to watch its lessons' });
      }
    }

    const lesson = await Lesson.findById(lessonId).populate('section');
    if (!lesson || !lesson.section || lesson.section.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    res.status(200).json({ lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching lesson' });
  }
};

// @route   PUT /api/courses/:courseId/lessons/:lessonId
// @access  Private (instructor only, must own the course)
export const updateLesson = async (req, res) => {
  try {
    const { title, videoUrl, attachmentUrl, attachmentTitle } = req.body;
    const { courseId, lessonId } = req.params;

    const course = req.resource; // Provided by verifyOwnership middleware

    const lesson = await Lesson.findById(lessonId).populate('section');
    if (!lesson || !lesson.section || lesson.section.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    if (title) lesson.title = title;
    if (videoUrl) lesson.videoUrl = videoUrl;
    if (attachmentUrl !== undefined) lesson.attachmentUrl = attachmentUrl;
    if (attachmentTitle !== undefined) lesson.attachmentTitle = attachmentTitle;

    await lesson.save();

    res.status(200).json({ lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating lesson' });
  }
};

// @route   DELETE /api/courses/:courseId/lessons/:lessonId
// @access  Private (instructor only, must own the course)
export const deleteLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You do not own this course' });
    }

    const lesson = await Lesson.findById(lessonId).populate('section');
    if (!lesson || !lesson.section || lesson.section.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    const sectionId = lesson.section._id;
    await lesson.deleteOne();

    // Re-number remaining lessons in the same section so there are no gaps
    const remaining = await Lesson.find({ section: sectionId }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.status(200).json({ message: 'Lesson deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting lesson' });
  }
};

// @route   PUT /api/courses/:courseId/lessons-reorder
// @access  Private (instructor only, must own the course)
export const reorderLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({ message: 'lessonIds array is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You do not own this course' });
    }

    for (let i = 0; i < lessonIds.length; i++) {
      await Lesson.findByIdAndUpdate(lessonIds[i], { order: i + 1 });
    }

    res.status(200).json({ message: 'Lessons reordered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error reordering lessons' });
  }
};
