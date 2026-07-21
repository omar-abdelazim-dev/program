import express from 'express';
import {
  getInstructorQuestions,
  replyToQuestion,
  createAnnouncement,
} from '../controllers/engagementController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all questions for courses taught by the instructor
router.get('/questions', protect, authorize('instructor'), getInstructorQuestions);

// Reply to a specific question
router.post('/questions/:id/reply', protect, authorize('instructor'), replyToQuestion);

// Create an announcement for a course
router.post('/announcements', protect, authorize('instructor'), createAnnouncement);

export default router;
