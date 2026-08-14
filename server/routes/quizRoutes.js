import express from 'express';
import { getGradingQueue, gradeSubmission } from '../controllers/quizController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize('instructor'), getGradingQueue);
router.patch('/:id/grade', protect, authorize('instructor'), validateObjectId('id'), gradeSubmission);

export default router;
