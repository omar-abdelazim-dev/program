import express from 'express';
import {
  getStats, getRecentActivity, getUsers, toggleBlockUser, changeUserRole,
  softDeleteUser, restoreUser, getTransactions
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes in this file to admins and superadmins
router.use(protect, authorize('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/activity', getRecentActivity);
router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.patch('/users/:id/role', changeUserRole);
router.delete('/users/:id/soft-delete', softDeleteUser);
router.patch('/users/:id/restore', restoreUser);
router.get('/transactions', getTransactions);

export default router;
