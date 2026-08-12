import express from 'express';
const router = express.Router();
import { getFinancials, requestPayout, requestPayoutOtp, processPayout, completePayout, rejectPayout } from '../controllers/financialController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { otpLimiter } from '../middleware/rateLimiter.js';

router.get('/', protect, authorize('instructor'), getFinancials);
router.post('/payout/otp', protect, authorize('instructor'), otpLimiter, requestPayoutOtp);
router.post('/payout', protect, authorize('instructor'), requestPayout);
router.put('/:id/process', protect, authorize('admin', 'superadmin'), processPayout);
router.put('/:id/complete', protect, authorize('admin', 'superadmin'), completePayout);
router.put('/:id/reject', protect, authorize('admin', 'superadmin'), rejectPayout);

export default router;
