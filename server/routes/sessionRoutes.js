import express from 'express';
import { getAllSessions, revokeSession, revokeAllSessions } from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authLimiter to prevent spamming revocation endpoints
router.use(protect, authLimiter);

router.get('/', getAllSessions);
router.delete('/:sessionId', revokeSession);
router.delete('/', revokeAllSessions);

export default router;
