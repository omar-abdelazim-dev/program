import express from 'express';
const router = express.Router();
import { getFinancials, requestPayout, completePayout, rejectPayout } from '../controllers/financialController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

router.get('/', protect, authorize('instructor'), getFinancials);
router.post('/payout', protect, authorize('instructor'), requestPayout);
router.put('/:id/complete', protect, authorize('admin', 'superadmin'), completePayout);

export default router;

router.put('/:id/reject', protect, authorize('admin', 'superadmin'), rejectPayout);
