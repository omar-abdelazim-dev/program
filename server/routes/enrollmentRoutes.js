import express from 'express';
import {
  enroll,
  requestEnrollment,
  getAdminEnrollmentRequests,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  getMyEnrollments,
  getEnrollmentStatus,
  markLessonComplete,
} from '../controllers/enrollmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Static routes before parameterized routes
router.get('/mine', protect, authorize('student'), getMyEnrollments);
router.get('/admin/requests', protect, authorize('admin'), getAdminEnrollmentRequests);
router.patch('/admin/requests/:requestId/approve', protect, authorize('admin'), approveEnrollmentRequest);
router.patch('/admin/requests/:requestId/reject', protect, authorize('admin'), rejectEnrollmentRequest);

// Student request enrollment route
router.post('/request/:courseId', protect, authorize('student'), requestEnrollment);

// Parameterized courseId routes
router.post('/:courseId', protect, authorize('student'), enroll);
router.get('/:courseId', protect, getEnrollmentStatus);
router.patch('/:courseId/lessons/:lessonId/complete', protect, authorize('student'), markLessonComplete);

export default router;
