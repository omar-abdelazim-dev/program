import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';

// Returns a course's modules, in order, each with its lessons attached (also
// in order). Single source of truth for the Course -> Module -> Lesson
// resolution that used to be duplicated across courseController/enrollmentController.
export const getModulesWithLessons = async (courseId, lessonSelect = null) => {
  const modules = await Module.find({ course: courseId }).sort({ order: 1 });
  const moduleIds = modules.map((m) => m._id);

  let lessonQuery = Lesson.find({ module: { $in: moduleIds } }).sort({ order: 1 });
  if (lessonSelect) lessonQuery = lessonQuery.select(lessonSelect);
  const lessons = await lessonQuery;

  const lessonsByModule = new Map();
  for (const lesson of lessons) {
    const key = lesson.module.toString();
    if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
    lessonsByModule.get(key).push(lesson);
  }

  return modules.map((module) => ({
    module,
    lessons: lessonsByModule.get(module._id.toString()) || [],
  }));
};

// Flat list of every lesson id belonging to a course (across all its modules).
export const getLessonIdsForCourse = async (courseId) => {
  const modules = await Module.find({ course: courseId }).select('_id');
  const moduleIds = modules.map((m) => m._id);
  const lessons = await Lesson.find({ module: { $in: moduleIds } }).select('_id');
  return lessons.map((l) => l._id);
};
