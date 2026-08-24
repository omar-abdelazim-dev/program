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
  submitCourseForReview,
  requestPriceChange,
  getPriceChangeRequests,
  approvePriceChange,
  rejectPriceChange,
  convertOngoingToFull,
} from '../controllers/courseController.js';
import { addLesson, getLessonContent, updateLesson, deleteLesson, reorderLessons } from '../controllers/lessonController.js';
import { createModule, updateModule, deleteModule, reorderModules, purchaseModule, getMyPurchasedModules } from '../controllers/moduleController.js';
import { protect, authorize, authorizeDoor, authorizeWithDoor, verifyOwnership } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';
import { validateCreateCourse, validateUpdateCourse, validateRequestPriceChange, validateConvertToFull } from '../validators/courseValidators.js';
import Course from '../models/Course.js';

const router = express.Router();

// --- Public catalog ---
router.get('/', getApprovedCourses);

// --- Admin (must come before /:id so 'pending'/'deletion-requests' aren't parsed as an id) ---
router.get('/pending', protect, authorizeDoor('admin', 'superadmin'), getPendingCourses);
router.get('/deletion-requests', protect, authorizeDoor('admin', 'superadmin'), getDeletionRequests);
router.get('/price-change-requests', protect, authorizeDoor('admin', 'superadmin'), getPriceChangeRequests);

// --- Instructor ---
router.post('/', protect, authorize('instructor'), validateCreateCourse, createCourse);
router.get('/mine', protect, authorize('instructor'), getMyCourses);
router.get('/stats', protect, authorize('instructor'), getInstructorStats);
router.patch('/:id/request-delete', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), requestDeleteCourse);
router.patch('/:id/submit-for-review', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), submitCourseForReview);
router.patch('/:id/publish', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), publishCourse);
router.post('/:id/request-price-change', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), validateRequestPriceChange, requestPriceChange);
router.patch('/:id/convert-to-full', protect, authorize('instructor'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), validateConvertToFull, convertOngoingToFull);

// --- Modules ---
router.post('/:courseId/modules', protect, authorize('instructor'), validateObjectId('courseId'), verifyOwnership(Course, 'courseId', 'instructor'), createModule);
router.put('/:courseId/modules/:moduleId', protect, authorize('instructor'), validateObjectId('courseId', 'moduleId'), verifyOwnership(Course, 'courseId', 'instructor'), updateModule);
router.delete('/:courseId/modules/:moduleId', protect, authorize('instructor'), validateObjectId('courseId', 'moduleId'), verifyOwnership(Course, 'courseId', 'instructor'), deleteModule);
router.put('/:courseId/modules-reorder', protect, authorize('instructor'), validateObjectId('courseId'), verifyOwnership(Course, 'courseId', 'instructor'), reorderModules);
router.post('/:courseId/modules/:moduleId/lessons', protect, authorize('instructor'), validateObjectId('courseId', 'moduleId'), verifyOwnership(Course, 'courseId', 'instructor'), addLesson);
router.put('/:courseId/modules/:moduleId/lessons-reorder', protect, authorize('instructor'), validateObjectId('courseId', 'moduleId'), verifyOwnership(Course, 'courseId', 'instructor'), reorderLessons);
router.post('/:courseId/modules/:moduleId/purchase', protect, authorize('student'), validateObjectId('courseId', 'moduleId'), purchaseModule);
router.get('/:courseId/modules/mine-purchased', protect, authorize('student'), validateObjectId('courseId'), getMyPurchasedModules);

// --- Lessons (id is globally unique, no need for :moduleId in these paths) ---
router.put('/:courseId/lessons/:lessonId', protect, authorize('instructor'), validateObjectId('courseId', 'lessonId'), verifyOwnership(Course, 'courseId', 'instructor'), updateLesson);
router.get('/:courseId/lessons/:lessonId', protect, validateObjectId('courseId', 'lessonId'), getLessonContent);
router.delete('/:courseId/lessons/:lessonId', protect, authorize('instructor'), validateObjectId('courseId', 'lessonId'), verifyOwnership(Course, 'courseId', 'instructor'), deleteLesson);

// --- Instructor (own course) or Admin/Superadmin (compliance edits) ---
router.put('/:id', protect, authorizeWithDoor('instructor', 'admin', 'superadmin'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), validateUpdateCourse, updateCourse);

// --- Admin actions on a specific course ---
router.get('/:id/enrollments', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), getCourseEnrollments);
router.patch('/:id/unpublish', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), unpublishCourse);
router.delete('/:id', protect, authorizeWithDoor('instructor', 'admin', 'superadmin'), validateObjectId('id'), verifyOwnership(Course, 'id', 'instructor'), deleteCourse);
router.patch('/:id/approve', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), approveCourse);
router.patch('/:id/reject', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), rejectCourse);
router.patch('/:id/reject-deletion', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), rejectDeletionRequest);
router.patch('/:id/suspend', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), suspendCourse);
router.patch('/:id/price-change/approve', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), approvePriceChange);
router.patch('/:id/price-change/reject', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), rejectPriceChange);

// --- Course details (public + owner/admin see extra) ---
router.get('/:id', optionalAuth, validateObjectId('id'), getCourseById);
router.patch('/:id/republish', protect, validateObjectId('id'), republishCourse);

export default router;
