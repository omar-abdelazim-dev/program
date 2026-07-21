'use strict';

/**
 * @file middlewares/authorize.js
 * RBAC authorization middleware factory.
 *
 * Roles (lowest → highest): student < instructor < admin < superadmin
 *
 * Usage:
 *   router.delete('/users/:id', authenticate, authorize('admin'), handler);
 *   router.get('/admin/logs',   authenticate, authorize('admin', 'superadmin'), handler);
 *
 * Prevents both horizontal (same role, different resource) and vertical
 * (lower role accessing higher-role routes) privilege escalation.
 */

const ApiError = require('../utils/ApiError');

// Role hierarchy for level-based comparisons
const ROLE_LEVELS = {
  student:    1,
  instructor: 2,
  admin:      3,
  superadmin: 4,
};

/**
 * Allow only users whose role is IN the provided allowedRoles list.
 * @param {...string} allowedRoles
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  next();
};

/**
 * Allow only users at or above a minimum role level.
 * @param {string} minRole - Minimum required role
 * @returns {Function} Express middleware
 */
const authorizeMinLevel = (minRole) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  const userLevel = ROLE_LEVELS[req.user.role] || 0;
  const minLevel  = ROLE_LEVELS[minRole] || 99;

  if (userLevel < minLevel) {
    return next(ApiError.forbidden('Insufficient permissions'));
  }

  next();
};

// ── Named role middlewares ─────────────────────────────────────────────────
// Convenience wrappers for common patterns.

const isSuperAdmin = authorize('superadmin');
const isAdmin      = authorize('admin', 'superadmin');
const isInstructor = authorize('instructor', 'admin', 'superadmin');
const isStudent    = authorize('student', 'instructor', 'admin', 'superadmin');

/**
 * Verify that the authenticated user is operating on their OWN resource.
 * Prevents horizontal privilege escalation (IDOR).
 *
 * Compares req.user.id against a resource's owner field.
 * Admins and superadmins bypass this check.
 *
 * @param {Function} getOwnerId - async fn(req) → string | ObjectId of the resource owner
 */
const isOwnerOrAdmin = (getOwnerId) => async (req, _res, next) => {
  try {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));

    // Admins can always proceed
    if (['admin', 'superadmin'].includes(req.user.role)) return next();

    const ownerId = await getOwnerId(req);
    if (!ownerId) return next(ApiError.notFound('Resource not found'));

    if (ownerId.toString() !== req.user.id) {
      return next(ApiError.forbidden('Access denied: you do not own this resource'));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authorize,
  authorizeMinLevel,
  isSuperAdmin,
  isAdmin,
  isInstructor,
  isStudent,
  isOwnerOrAdmin,
  ROLE_LEVELS,
};
