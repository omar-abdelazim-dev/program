import express from 'express';
import { register, login, logout, getMe, promoteToAdmin, promoteToSuperAdmin, checkEmail } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-email', checkEmail);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe); // protect runs first — if it fails, getMe never runs
router.patch('/promote', protect, authorize('superadmin'), promoteToAdmin);
router.patch('/promote-superadmin', protect, authorize('superadmin'), promoteToSuperAdmin);

export default router;
