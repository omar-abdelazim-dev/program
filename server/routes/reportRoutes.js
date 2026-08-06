import express from 'express';
import { param } from 'express-validator';
import { createReport, getReports, resolveReport } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { handleValidationErrors } from '../validators/authValidators.js';

const router = express.Router();

const validateReportIdParam = [
  param('id').isMongoId().withMessage('Invalid report ID format'),
  handleValidationErrors,
];

router.post('/', protect, authorize('student'), createReport);
router.get('/', protect, authorize('admin', 'superadmin'), getReports);
router.patch('/:id/resolve', protect, authorize('admin', 'superadmin'), validateReportIdParam, resolveReport);

export default router;
