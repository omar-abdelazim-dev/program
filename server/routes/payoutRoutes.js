import express from 'express';
import { protect, authorize, authorizeDoor, authorizeWithDoor } from '../middleware/authMiddleware.js';
import { otpLimiter } from '../middleware/rateLimiter.js';
import {
  requestOtp,
  verifyPayoutOtp,
  approvePayout,
  executePayout,
  getPayoutStatus,
} from '../controllers/payoutOtpController.js';

const router = express.Router();

// POST /api/payouts/:id/request-otp
// Instructor-only. Rate-limited. Generates + emails OTP.
router.post('/:id/request-otp', protect, authorize('instructor'), otpLimiter, requestOtp);

// POST /api/payouts/:id/verify-otp
// Instructor-only. Timing-safe OTP check inside a DB transaction.
router.post('/:id/verify-otp', protect, authorize('instructor'), otpLimiter, verifyPayoutOtp);

// POST /api/payouts/:id/approve
// Finance approver (admin/superadmin only). Self-approval blocked in controller.
router.post('/:id/approve', protect, authorizeDoor('admin', 'superadmin'), approvePayout);

// POST /api/payouts/:id/execute
// Admin-only. Idempotent — atomically claims the payout before calling provider.
router.post('/:id/execute', protect, authorizeDoor('admin', 'superadmin'), executePayout);

// GET /api/payouts/:id
// Owner or admin/superadmin only (checked in controller).
router.get('/:id', protect, authorizeWithDoor('student', 'instructor', 'admin', 'superadmin'), getPayoutStatus);

export default router;
