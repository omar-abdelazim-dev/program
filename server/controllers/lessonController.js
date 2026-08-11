import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @route   POST /api/courses/:courseId/modules/:moduleId/lessons
// @access  Private (instructor only, must own the course)
export const addLesson = async (req, res) => {
  try {
    const { title, videoUrl, attachmentUrl, attachmentTitle, description } = req.body;
    const { courseId, moduleId } = req.params;

    if (!title || !videoUrl) {
      return res.status(400).json({ message: 'Title and video URL are required' });
    }

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    const existingCount = await Lesson.countDocuments({ module: module._id });

    const lesson = await Lesson.create({
      title,
      description: description || '',
      videoUrl,
      attachmentUrl: attachmentUrl || '',
      attachmentTitle: attachmentTitle || '',
      module: module._id,
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

    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson || !lesson.module || lesson.module.course.toString() !== courseId) {
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
    const { title, videoUrl, attachmentUrl, attachmentTitle, description, status } = req.body;
    const { courseId, lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson || !lesson.module || lesson.module.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    if (title) lesson.title = title;
    if (videoUrl) lesson.videoUrl = videoUrl;
    if (description !== undefined) lesson.description = description;
    if (attachmentUrl !== undefined) lesson.attachmentUrl = attachmentUrl;
    if (attachmentTitle !== undefined) lesson.attachmentTitle = attachmentTitle;
    if (status) lesson.status = status;

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

    const lesson = await Lesson.findById(lessonId).populate('module');
    if (!lesson || !lesson.module || lesson.module.course.toString() !== courseId) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    const moduleId = lesson.module._id;
    await lesson.deleteOne();

    // Re-number remaining lessons in the same module so there are no gaps
    const remaining = await Lesson.find({ module: moduleId }).sort({ order: 1 });
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

// @route   PUT /api/courses/:courseId/modules/:moduleId/lessons-reorder
// @access  Private (instructor only, must own the course)
export const reorderLessons = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({ message: 'lessonIds array is required' });
    }

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    const existing = await Lesson.find({ module: module._id }).select('_id');
    const existingIds = new Set(existing.map((l) => l._id.toString()));

    if (lessonIds.length !== existingIds.size || !lessonIds.every((id) => existingIds.has(id))) {
      return res.status(400).json({ message: 'lessonIds must exactly match this module\'s lessons' });
    }

    await Lesson.bulkWrite(
      lessonIds.map((id, i) => ({
        updateOne: { filter: { _id: id, module: module._id }, update: { order: i + 1 } },
      }))
    );

    res.status(200).json({ message: 'Lessons reordered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error reordering lessons' });
  }
};
