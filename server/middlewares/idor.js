'use strict';

/**
 * @file middlewares/idor.js
 * IDOR (Insecure Direct Object Reference) protection middleware.
 *
 * Provides reusable ownership-verification middleware factories.
 * These are used at the route level to prevent horizontal privilege escalation.
 *
 * Principles:
 *  - Never trust IDs from the client.
 *  - Always verify the requesting user owns or has access to the resource.
 *  - Admins bypass ownership checks (vertical access is handled by authorize()).
 *
 * OWASP Top 10: A01 — Broken Access Control
 */

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

/**
 * Generic IDOR check.
 * Loads a resource and verifies the requesting user owns it.
 *
 * @param {object} opts
 * @param {Function}        opts.getResource   - async fn(id) → resource document
 * @param {Function}        opts.getOwnerId    - fn(resource) → string | ObjectId of owner
 * @param {string}          [opts.paramName]   - Route param containing the resource ID (default: 'id')
 * @param {string[]}        [opts.adminRoles]  - Roles that bypass ownership check
 * @param {string}          [opts.attachAs]    - If set, attaches loaded resource to req[attachAs]
 * @returns {Function} Express middleware
 */
const verifyOwnership = ({
  getResource,
  getOwnerId,
  paramName = 'id',
  adminRoles = ['admin', 'superadmin'],
  attachAs,
}) =>
  asyncHandler(async (req, _res, next) => {
    const resourceId = req.params[paramName];

    // ── 1. Validate ObjectId format ──────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      throw ApiError.badRequest(`Invalid ${paramName} format`);
    }

    // ── 2. Admins bypass ownership check ─────────────────────────────────
    if (adminRoles.includes(req.user?.role)) {
      // Still load the resource so controllers don't duplicate the query
      if (attachAs) {
        const resource = await getResource(resourceId);
        if (!resource) throw ApiError.notFound('Resource not found');
        req[attachAs] = resource;
      }
      return next();
    }

    // ── 3. Load the resource ──────────────────────────────────────────────
    const resource = await getResource(resourceId);

    // Always use 404 instead of 403 — don't reveal existence of resources
    // the user cannot access (OWASP ASVS §4.2.1)
    if (!resource) throw ApiError.notFound('Resource not found');

    // ── 4. Verify ownership ───────────────────────────────────────────────
    const ownerId = getOwnerId(resource);
    if (!ownerId || ownerId.toString() !== req.user.id) {
      throw ApiError.notFound('Resource not found'); // Intentional 404, not 403
    }

    // ── 5. Optionally attach to request ───────────────────────────────────
    if (attachAs) req[attachAs] = resource;

    next();
  });

/**
 * Verify that req.params.id matches req.user.id (self-only operations).
 * Admins can operate on any user.
 */
const verifySelf = asyncHandler(async (req, _res, next) => {
  const targetId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw ApiError.badRequest('Invalid user ID format');
  }

  if (['admin', 'superadmin'].includes(req.user?.role)) return next();

  if (targetId !== req.user.id) {
    throw ApiError.notFound('Resource not found');
  }

  next();
});

module.exports = { verifyOwnership, verifySelf };
