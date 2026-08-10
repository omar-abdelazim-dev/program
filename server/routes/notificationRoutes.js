import express from 'express';
import { getUserNotifications, markAsRead, clearNotification, clearAllNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserNotifications);
router.patch('/:id/read', protect, markAsRead);
router.delete('/:id', protect, clearNotification);
router.delete('/', protect, clearAllNotifications);

export default router;
