import express from 'express';
import { param } from 'express-validator';
import { createReport, getReports, resolveReport } from '../controllers/reportController.js';
import { protect, authorize, authorizeDoor } from '../middleware/authMiddleware.js';
import { handleValidationErrors } from '../validators/authValidators.js';

const router = express.Router();

const validateReportIdParam = [
  param('id').isMongoId().withMessage('Invalid report ID format'),
  handleValidationErrors,
];

router.post('/', protect, authorize('student'), createReport);
router.get('/', protect, authorizeDoor('admin', 'superadmin'), getReports);
router.patch('/:id/resolve', protect, authorizeDoor('admin', 'superadmin'), validateReportIdParam, resolveReport);

export default router;
