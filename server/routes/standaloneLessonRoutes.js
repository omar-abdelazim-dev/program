import express from 'express';
import {
  createStandaloneLesson,
  getMyStandaloneLessons,
  updateStandaloneLesson,
  deleteStandaloneLesson,
  getStandaloneLessons,
  getStandaloneLessonById,
  getStandaloneLessonAccess,
  purchaseStandaloneLesson,
  getMyPurchasedStandaloneLessons,
  getPendingStandaloneLessons,
  approveStandaloneLesson,
  rejectStandaloneLesson,
  getPendingStandaloneLessonPurchases,
  approveStandaloneLessonPurchase,
  rejectStandaloneLessonPurchase,
} from '../controllers/standaloneLessonController.js';
import { protect, authorize, authorizeDoor } from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';
import { validateCreateStandaloneLesson, validateUpdateStandaloneLesson } from '../validators/standaloneLessonValidators.js';

const router = express.Router();

// --- Admin (must come before /:id so these aren't parsed as an id) ---
router.get('/pending', protect, authorizeDoor('admin', 'superadmin'), getPendingStandaloneLessons);
router.get('/purchases/pending', protect, authorizeDoor('admin', 'superadmin'), getPendingStandaloneLessonPurchases);
router.patch('/purchases/:id/approve', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), approveStandaloneLessonPurchase);
router.patch('/purchases/:id/reject', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), rejectStandaloneLessonPurchase);

// --- Instructor ---
router.post('/', protect, authorize('instructor'), validateCreateStandaloneLesson, createStandaloneLesson);
router.get('/mine', protect, authorize('instructor'), getMyStandaloneLessons);
router.put('/:id', protect, authorize('instructor'), validateObjectId('id'), validateUpdateStandaloneLesson, updateStandaloneLesson);
router.delete('/:id', protect, authorize('instructor'), validateObjectId('id'), deleteStandaloneLesson);

// --- Student ---
router.get('/mine-purchased', protect, authorize('student'), getMyPurchasedStandaloneLessons);
router.post('/:id/purchase', protect, authorize('student'), validateObjectId('id'), purchaseStandaloneLesson);
router.get('/:id/access', protect, validateObjectId('id'), getStandaloneLessonAccess);

// --- Public discovery ---
router.get('/', getStandaloneLessons);
router.get('/:id', optionalAuth, validateObjectId('id'), getStandaloneLessonById);

// --- Admin actions on a specific lesson ---
router.patch('/:id/approve', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), approveStandaloneLesson);
router.patch('/:id/reject', protect, authorizeDoor('admin', 'superadmin'), validateObjectId('id'), rejectStandaloneLesson);

export default router;
