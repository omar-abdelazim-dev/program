import express from 'express';
import {
  getInstructorQuestions,
  replyToQuestion,
  createAnnouncement,
  createQuestion,
  getCourseQuestions,
  deleteReply,
  deleteQuestion,
  getUnreadQuestionsCount,
  updateQuestionStatus,
  editQuestion,
  getCourseAnnouncements
} from '../controllers/engagementController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get count of unread questions for the instructor
router.get('/questions/unread-count', protect, authorize('instructor'), getUnreadQuestionsCount);

// Get all questions for courses taught by the instructor
router.get('/questions', protect, authorize('instructor'), getInstructorQuestions);

// Update a question's status
router.patch('/questions/:id/status', protect, authorize('instructor'), updateQuestionStatus);

// Reply to a specific question (or edit an existing reply)
router.post('/questions/:id/reply', protect, authorize('instructor'), replyToQuestion);

// Delete an instructor's reply
router.delete('/questions/:id/reply', protect, authorize('instructor'), deleteReply);

// Delete a question entirely (instructor or question owner)
router.delete('/questions/:id', protect, deleteQuestion);

// Edit a question (only owner if pending)
router.patch('/questions/:id', protect, editQuestion);

// Create an announcement for a course
router.post('/announcements', protect, authorize('instructor'), createAnnouncement);

// Create a new question for a course
router.post('/questions', protect, createQuestion);

// Get all questions for a specific course
router.get('/course/:courseId/questions', protect, getCourseQuestions);

// Get all announcements for a specific course
router.get('/course/:courseId/announcements', protect, getCourseAnnouncements);

export default router;
