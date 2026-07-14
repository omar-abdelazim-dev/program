import express from 'express';
import {
  enroll,
  getMyEnrollments,
  getEnrollmentStatus,
  markLessonComplete,
} from '../controllers/enrollmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 'mine' must be registered before '/:courseId' so Express doesn't try to
// treat the literal word "mine" as a courseId.
router.get('/mine', protect, authorize('student'), getMyEnrollments);

router.post('/:courseId', protect, authorize('student'), enroll);
router.get('/:courseId', protect, getEnrollmentStatus);
router.patch('/:courseId/lessons/:lessonId/complete', protect, authorize('student'), markLessonComplete);

export default router;
