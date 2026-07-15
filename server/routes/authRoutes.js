import express from 'express';
import { register, login, logout, getMe, promoteToAdmin, promoteToInstructor, promoteToSuperAdmin, checkEmail } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/check-email', authLimiter, checkEmail);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe); // protect runs first — if it fails, getMe never runs
router.patch('/promote', protect, authorize('superadmin'), promoteToAdmin);
router.patch('/promote-superadmin', protect, authorize('superadmin'), promoteToSuperAdmin);
router.patch('/promote-instructor', protect, authorize('superadmin', 'admin'), promoteToInstructor);

export default router;
