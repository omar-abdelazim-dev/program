import express from 'express';
import { param } from 'express-validator';
import { getUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { handleValidationErrors } from '../validators/authValidators.js';

const router = express.Router();

const validateUserIdParam = [
  param('id').isMongoId().withMessage('Invalid user ID format'),
  handleValidationErrors,
];

router.get('/:id/profile', protect, validateUserIdParam, getUserProfile);

export default router;
