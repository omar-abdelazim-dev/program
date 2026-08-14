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

// A published Full Course is considered complete: the instructor can no
// longer add modules/lessons to it (spec §4). Ongoing courses and courses
// with no courseType set (everything created before this feature shipped)
// are never locked. 'approved' is this codebase's "live" status — see the
// status enum comment on the Course model.
export const isCourseContentLocked = (course) =>
  course.courseType === 'full' && course.status === 'approved';

// Flat list of every lesson id belonging to a course (across all its modules).
export const getLessonIdsForCourse = async (courseId) => {
  const modules = await Module.find({ course: courseId }).select('_id');
  const moduleIds = modules.map((m) => m._id);
  const lessons = await Lesson.find({ module: { $in: moduleIds } }).select('_id');
  return lessons.map((l) => l._id);
};

// Builds the per-module completion breakdown returned alongside overall
// progress by enrollmentController/quizController.
export const computeModuleProgress = (grouped, completedIds) => {
  const completedSet = new Set(completedIds.map((id) => id.toString()));
  return grouped.map(({ module, lessons }) => {
    const totalCount = lessons.length;
    const completedCount = lessons.filter((l) => completedSet.has(l._id.toString())).length;
    return {
      moduleId: module._id,
      title: module.title,
      completedCount,
      totalCount,
      percent: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    };
  });
};
