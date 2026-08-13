import express from 'express';
import {
  enroll,
  getMyEnrollments,
  getEnrollmentStatus,
  markLessonComplete,
} from '../controllers/enrollmentController.js';
import { submitQuiz, getMySubmission } from '../controllers/quizController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

// 'mine' must be registered before '/:courseId' so Express doesn't try to
// treat the literal word "mine" as a courseId.
router.get('/mine', protect, authorize('student'), getMyEnrollments);

router.post('/:courseId', protect, authorize('student'), validateObjectId('courseId'), enroll);
router.get('/:courseId', protect, validateObjectId('courseId'), getEnrollmentStatus);
router.patch('/:courseId/lessons/:lessonId/complete', protect, authorize('student'), validateObjectId('courseId', 'lessonId'), markLessonComplete);
router.post('/:courseId/lessons/:lessonId/quiz-submit', protect, authorize('student'), validateObjectId('courseId', 'lessonId'), submitQuiz);
router.get('/:courseId/lessons/:lessonId/quiz-submission', protect, authorize('student'), validateObjectId('courseId', 'lessonId'), getMySubmission);

export default router;
