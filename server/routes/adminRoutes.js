import express from 'express';
import {
  toggleProgramInstructor,
  getStats, getRecentActivity, getSystemHealth, getRevenueAnalytics, getUsers, toggleBlockUser, changeUserRole,
  softDeleteUser, restoreUser, getTransactions, getPendingPayouts, getPayoutRevenueTrace, getAllLessons, approveLesson, rejectLesson, deleteLessonAdmin,
  manualEnroll, createPromoCode, getPromoCodes, togglePromoCode, createDiscountCode, getDiscountCodes,
  updateDiscountCode, toggleDiscountCode, renewDiscountCode, deleteDiscountCode,
  approveEnrollment, rejectEnrollment,
  getInstructorViolations, getInstructorViolationSummary,
  getStudentAnalytics,
  getInstructorAnalytics
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';
import { validateUserIdParam, validateRoleChange } from '../validators/adminValidators.js';

const router = express.Router();

// Protect all routes in this file to admins and superadmins
router.use(protect, authorize('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/health', getSystemHealth);
// Recent Activity is superadmin-only (ADM-02) — narrower than the router-wide
// admin/superadmin gate above.
router.get('/activity', authorize('superadmin'), getRecentActivity);
router.get('/revenue-analytics', getRevenueAnalytics);
router.get('/analytics', getStudentAnalytics);
router.get('/instructor-analytics', getInstructorAnalytics);
router.get('/users', getUsers);
// validateUserIdParam ensures :id is a valid MongoDB ObjectId before hitting the DB
router.patch('/users/:id/block', validateUserIdParam, toggleBlockUser); // Keep for backwards compatibility
router.patch('/users/:id/role', validateUserIdParam, validateRoleChange, changeUserRole);
router.patch('/users/:id/program-instructor', validateUserIdParam, toggleProgramInstructor);
router.delete('/users/:id/soft-delete', validateUserIdParam, softDeleteUser);
router.patch('/users/:id/restore', validateUserIdParam, restoreUser);
router.get('/transactions', getTransactions);
router.get('/payouts', getPendingPayouts);
router.get('/payouts/:id/revenue-trace', validateObjectId('id'), getPayoutRevenueTrace);
router.post('/enroll', manualEnroll);
router.post('/promo-codes', createPromoCode);
router.get('/promo-codes', getPromoCodes);
router.patch('/promo-codes/:id/toggle', validateObjectId('id'), togglePromoCode);
router.post('/discount-codes', authorize('superadmin'), createDiscountCode);
router.get('/discount-codes', authorize('superadmin'), getDiscountCodes);
router.put('/discount-codes/:id', authorize('superadmin'), validateObjectId('id'), updateDiscountCode);
router.patch('/discount-codes/:id/toggle', authorize('superadmin'), validateObjectId('id'), toggleDiscountCode);
router.patch('/discount-codes/:id/renew', authorize('superadmin'), validateObjectId('id'), renewDiscountCode);
router.delete('/discount-codes/:id', authorize('superadmin'), validateObjectId('id'), deleteDiscountCode);
router.get('/lessons', getAllLessons);
router.patch('/lessons/:id/approve', validateObjectId('id'), approveLesson);
router.patch('/lessons/:id/reject', validateObjectId('id'), rejectLesson);
router.delete('/lessons/:id', validateObjectId('id'), deleteLessonAdmin);
router.patch('/enrollments/:id/approve', validateObjectId('id'), approveEnrollment);
router.patch('/enrollments/:id/reject', validateObjectId('id'), rejectEnrollment);
router.get('/instructor-violations/summary', getInstructorViolationSummary);
router.get('/instructor-violations', getInstructorViolations);

export default router;
