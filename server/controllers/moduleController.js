import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import { isCourseContentLocked } from '../utils/courseContent.js';

// @route   POST /api/courses/:courseId/modules
// @access  Private (instructor only, must own the course)
export const createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, price } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Module title is required' });
    }

    const course = await Course.findById(courseId).select('courseType status');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (isCourseContentLocked(course)) {
      return res.status(403).json({ message: 'This course is published and locked — Full Courses cannot be modified after publishing.' });
    }

    let modulePrice = 0;
    if (course.courseType === 'ongoing') {
      modulePrice = Number(price);
      if (!Number.isFinite(modulePrice) || modulePrice < 50 || modulePrice > 200) {
        return res.status(400).json({ message: 'Ongoing course module price must be between 50 EGP and 200 EGP.' });
      }
    }

    const existingCount = await Module.countDocuments({ course: courseId });

    const module = await Module.create({
      course: courseId,
      title,
      description: description || '',
      order: existingCount + 1,
      status: 'published',
      price: modulePrice,
    });

    res.status(201).json({ module: { ...module.toObject(), lessons: [] } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating module' });
  }
};

// @route   PUT /api/courses/:courseId/modules/:moduleId
// @access  Private (instructor only, must own the course)
export const updateModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, description, price } = req.body;

    const course = await Course.findById(courseId).select('courseType status');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    if (title) module.title = title;
    if (description !== undefined) module.description = description;

    if (course.courseType === 'ongoing' && price !== undefined) {
      const modulePrice = Number(price);
      if (!Number.isFinite(modulePrice) || modulePrice < 50 || modulePrice > 200) {
        return res.status(400).json({ message: 'Ongoing course module price must be between 50 EGP and 200 EGP.' });
      }
      module.price = modulePrice;
    }

    await module.save();

    res.status(200).json({ module });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating module' });
  }
};

// @route   DELETE /api/courses/:courseId/modules/:moduleId
// @access  Private (instructor only, must own the course)
export const deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const module = await Module.findOne({ _id: moduleId, course: courseId });
    if (!module) {
      return res.status(404).json({ message: 'Module not found in this course' });
    }

    await Lesson.deleteMany({ module: module._id });
    await module.deleteOne();

    // Re-number remaining modules so there are no gaps
    const remaining = await Module.find({ course: courseId }).sort({ order: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }

    res.status(200).json({ message: 'Module deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting module' });
  }
};

// @route   PUT /api/courses/:courseId/modules-reorder
// @access  Private (instructor only, must own the course)
export const reorderModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({ message: 'moduleIds array is required' });
    }

    const existing = await Module.find({ course: courseId }).select('_id');
    const existingIds = new Set(existing.map((m) => m._id.toString()));

    if (moduleIds.length !== existingIds.size || !moduleIds.every((id) => existingIds.has(id))) {
      return res.status(400).json({ message: 'moduleIds must exactly match this course\'s modules' });
    }

    await Module.bulkWrite(
      moduleIds.map((id, i) => ({
        updateOne: { filter: { _id: id, course: courseId }, update: { order: i + 1 } },
      }))
    );

    res.status(200).json({ message: 'Modules reordered' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error reordering modules' });
  }
};
