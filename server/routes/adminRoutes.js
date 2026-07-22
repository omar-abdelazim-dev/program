import express from 'express';
import {
  getStats, getRecentActivity, getRevenueAnalytics, getUsers, toggleBlockUser, changeUserRole,
  softDeleteUser, restoreUser, getTransactions, getPendingPayouts
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateUserIdParam, validateRoleChange } from '../validators/adminValidators.js';

const router = express.Router();

// Protect all routes in this file to admins and superadmins
router.use(protect, authorize('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/activity', getRecentActivity);
router.get('/revenue-analytics', getRevenueAnalytics);
router.get('/users', getUsers);
// validateUserIdParam ensures :id is a valid MongoDB ObjectId before hitting the DB
router.patch('/users/:id/block', validateUserIdParam, toggleBlockUser); // Keep for backwards compatibility
router.patch('/users/:id/role', validateUserIdParam, validateRoleChange, changeUserRole);
router.delete('/users/:id/soft-delete', validateUserIdParam, softDeleteUser);
router.patch('/users/:id/restore', validateUserIdParam, restoreUser);
router.get('/transactions', getTransactions);
router.get('/payouts', getPendingPayouts);

export default router;

