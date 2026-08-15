import express from 'express';
import { getConfig, updateConfigSection, previewFinancials, getPublicConfig, sendTestEmail } from '../controllers/systemConfigController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.route('/public')
  .get(getPublicConfig);

// All subsequent routes require at least admin privileges
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/')
  .get(getConfig);

router.route('/financial/preview')
  .post(previewFinancials);

router.route('/email/test')
  .post(sendTestEmail);

router.route('/:section')
  .patch(updateConfigSection);

export default router;
