import express from 'express';
import { getConfig, updateConfigSection, previewFinancials, getPublicConfig, sendTestEmail, getEmailStatus, getStorageStats, getStorageStatus } from '../controllers/systemConfigController.js';
import { protect, authorizeDoor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.route('/public')
  .get(getPublicConfig);

// All subsequent routes require at least admin privileges
router.use(protect);
router.use(authorizeDoor('admin', 'superadmin'));

router.route('/')
  .get(getConfig);

router.route('/storage-stats')
  .get(getStorageStats);

router.route('/storage/status')
  .get(getStorageStatus);

router.route('/financial/preview')
  .post(previewFinancials);

router.route('/email/test')
  .post(sendTestEmail);

router.route('/email/status')
  .get(getEmailStatus);

router.route('/:section')
  .patch(updateConfigSection);

export default router;
