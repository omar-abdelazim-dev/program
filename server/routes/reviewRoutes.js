import express from 'express';
import {
  getInstructorReviews,
  reportReview,
  createReview,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Student submits a review
router.post('/', protect, authorize('student'), createReview);

// Instructor gets all reviews for their courses
router.get('/instructor', protect, authorize('instructor'), getInstructorReviews);

// Instructor reports a review
router.patch('/:id/report', protect, authorize('instructor'), reportReview);

export default router;
