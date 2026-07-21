import express from 'express';
import { register, login, logout, getMe, checkEmail, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/check-email', authLimiter, checkEmail);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe); // protect runs first — if it fails, getMe never runs
router.patch('/profile', protect, updateProfile);
// authLimiter here too: an authenticated attacker with a stolen session
// could otherwise brute-force the current-password check indefinitely.
router.patch('/change-password', protect, authLimiter, changePassword);

export default router;
