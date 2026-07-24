import express from 'express';
import {
  createCourse,
  getMyCourses,
  getApprovedCourses,
  getCourseById,
  getPendingCourses,
  approveCourse,
  rejectCourse,
  getInstructorStats,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController.js';
import { addLesson, getLessonContent } from '../controllers/lessonController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// --- Public catalog ---
router.get('/', getApprovedCourses);

// --- Admin (must come before /:id so 'pending' isn't parsed as an id) ---
router.get('/pending', protect, authorize('admin', 'superadmin'), getPendingCourses);

// --- Instructor ---
router.post('/', protect, authorize('instructor'), createCourse);
router.get('/mine', protect, authorize('instructor'), getMyCourses);
router.get('/stats', protect, authorize('instructor'), getInstructorStats);
router.put('/:id', protect, authorize('instructor'), updateCourse);
router.delete('/:id', protect, authorize('instructor'), deleteCourse);
router.post('/:courseId/lessons', protect, authorize('instructor'), addLesson);
router.get('/:courseId/lessons/:lessonId', protect, getLessonContent);

// --- Admin actions on a specific course ---
router.patch('/:id/approve', protect, authorize('admin', 'superadmin'), approveCourse);
router.patch('/:id/reject', protect, authorize('admin', 'superadmin'), rejectCourse);

// --- Course details (public + owner/admin see extra) ---
router.get('/:id', optionalAuth, getCourseById);

export default router;
