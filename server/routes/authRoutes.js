import express from 'express';
import { register, login, logout, getMe, checkEmail, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import {
  validateRegister,
  validateLogin,
  validateCheckEmail,
  validateChangePassword,
  validateUpdateProfile,
} from '../validators/authValidators.js';

const router = express.Router();

// authLimiter on check-email: prevents email enumeration via timing side-channel
router.post('/check-email', authLimiter, validateCheckEmail, checkEmail);
// registerLimiter: tighter than authLimiter — 3 registrations/hour per IP
router.post('/register', registerLimiter, validateRegister, register);
// loginLimiter: 5 attempts/15 min — hardest protection against brute-force
router.post('/login', loginLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me', protect, getMe); // protect runs first — if it fails, getMe never runs
router.patch('/profile', protect, validateUpdateProfile, updateProfile);
// authLimiter here too: an authenticated attacker with a stolen session
// could otherwise brute-force the current-password check indefinitely.
router.patch('/change-password', protect, authLimiter, validateChangePassword, changePassword);

export default router;

