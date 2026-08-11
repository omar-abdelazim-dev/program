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
  requestDeleteCourse,
  getDeletionRequests,
  rejectDeletionRequest,
  getCourseEnrollments,
  unpublishCourse,
  suspendCourse,
  republishCourse,
  publishCourse,
} from '../controllers/courseController.js';
import { addLesson, getLessonContent, updateLesson, deleteLesson, reorderLessons } from '../controllers/lessonController.js';
import { protect, authorize, verifyOwnership } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';
import { validateCreateCourse, validateUpdateCourse } from '../validators/courseValidators.js';
import Course from '../models/Course.js';

const router = express.Router();

// --- Public catalog ---
router.get('/', getApprovedCourses);

// --- Admin (must come before /:id so 'pending'/'deletion-requests' aren't parsed as an id) ---
router.get('/pending', protect, authorize('admin', 'superadmin'), getPendingCourses);
router.get('/deletion-requests', protect, authorize('admin', 'superadmin'), getDeletionRequests);

// --- Instructor ---
router.post('/', protect, authorize('instructor'), validateCreateCourse, createCourse);
router.get('/mine', protect, authorize('instructor'), getMyCourses);
router.get('/stats', protect, authorize('instructor'), getInstructorStats);
router.patch('/:id/request-delete', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), requestDeleteCourse);
router.patch('/:id/publish', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), publishCourse);
router.post('/:courseId/lessons', protect, authorize('instructor'), validateObjectId('courseId'), verifyOwnership(Course, 'courseId', 'instructor'), addLesson);
router.put('/:courseId/lessons/:lessonId', protect, authorize('instructor'), validateObjectId('courseId', 'lessonId'), verifyOwnership(Course, 'courseId', 'instructor'), updateLesson);
router.get('/:courseId/lessons/:lessonId', protect, validateObjectId('courseId', 'lessonId'), getLessonContent);
router.delete('/:courseId/lessons/:lessonId', protect, authorize('instructor'), validateObjectId('courseId', 'lessonId'), verifyOwnership(Course, 'courseId', 'instructor'), deleteLesson);
router.put('/:courseId/lessons-reorder', protect, authorize('instructor'), validateObjectId('courseId'), verifyOwnership(Course, 'courseId', 'instructor'), reorderLessons);

// --- Instructor (own course) or Admin/Superadmin (compliance edits) ---
router.put('/:id', protect, authorize('instructor', 'admin', 'superadmin'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), validateUpdateCourse, updateCourse);

// --- Admin actions on a specific course ---
router.get('/:id/enrollments', protect, authorize('admin', 'superadmin'), validateObjectId('id'), getCourseEnrollments);
router.patch('/:id/unpublish', protect, authorize('admin', 'superadmin'), validateObjectId('id'), unpublishCourse);
router.delete('/:id', protect, authorize('admin', 'superadmin'), validateObjectId('id'), deleteCourse);
router.patch('/:id/approve', protect, authorize('admin', 'superadmin'), validateObjectId('id'), approveCourse);
router.patch('/:id/reject', protect, authorize('admin', 'superadmin'), validateObjectId('id'), rejectCourse);
router.patch('/:id/reject-deletion', protect, authorize('admin', 'superadmin'), validateObjectId('id'), rejectDeletionRequest);
router.patch('/:id/suspend', protect, authorize('admin', 'superadmin'), validateObjectId('id'), suspendCourse);

// --- Course details (public + owner/admin see extra) ---
router.get('/:id', optionalAuth, validateObjectId('id'), getCourseById);
router.patch('/:id/republish', protect, validateObjectId('id'), republishCourse);

export default router;
