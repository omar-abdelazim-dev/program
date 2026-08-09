import express from 'express';
import {
  getInstructorReviews,
  reportReview,
  createReview,
  getCourseReviews,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Student submits a review
router.post('/', protect, authorize('student'), createReview);

// Student edits their review
router.put('/:id', protect, authorize('student'), updateReview);

// Student deletes their review
router.delete('/:id', protect, authorize('student'), deleteReview);

// Public route to get reviews for a course
router.get('/course/:id', getCourseReviews);

// Instructor gets all reviews for their courses
router.get('/instructor', protect, authorize('instructor'), getInstructorReviews);

// Instructor reports a review
router.patch('/:id/report', protect, authorize('instructor'), reportReview);

export default router;
