'use strict';

/**
 * @file routes/session.routes.js
 * Sprint 2 — Session Management Routes.
 *
 * GET  /api/v1/sessions       — list active sessions for authenticated user
 * DELETE /api/v1/sessions/:jti — revoke a specific session
 * DELETE /api/v1/sessions     — revoke all sessions (logout everywhere)
 */

const { Router } = require('express');
const router = Router();

const authenticate       = require('../middlewares/authenticate');
const asyncHandler       = require('../utils/asyncHandler');
const ApiResponse        = require('../utils/ApiResponse');
const ApiError           = require('../utils/ApiError');
const { getActiveSessions, revokeAllSessions } = require('../security/sessionManager');
const { revokeToken }    = require('../security/tokenBlacklist');
const RefreshToken       = require('../models/RefreshToken');
const { securityLogger } = require('../utils/logger');

// All session routes require authentication
router.use(authenticate);

// GET /api/v1/sessions — list active sessions
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sessions = await getActiveSessions(req.user.id);

    // Mask jti — return only metadata
    const safe = sessions.map((s) => ({
      sessionId: s._id,
      ip:        s.ip,
      device:    s.userAgent ? s.userAgent.substring(0, 100) : 'Unknown',
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    new ApiResponse(200, { sessions: safe, count: safe.length }).send(res);
  })
);

// DELETE /api/v1/sessions/:sessionId — revoke a specific session
router.delete(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await RefreshToken.findOne({
      _id: sessionId,
      user: req.user.id,
      revoked: false,
    });

    if (!session) throw ApiError.notFound('Session not found');

    await revokeToken(session.jti, Math.floor(new Date(session.expiresAt).getTime() / 1000));
    await RefreshToken.updateOne(
      { _id: session._id },
      { revoked: true, revokedAt: new Date() }
    );

    securityLogger.securityEvent('SESSION_MANUALLY_REVOKED', {
      userId: req.user.id,
      sessionId,
      ip: req.ip,
    });

    new ApiResponse(200, null, 'Session revoked successfully').send(res);
  })
);

// DELETE /api/v1/sessions — logout from all devices
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await revokeAllSessions(req.user.id, 'LOGOUT_ALL_DEVICES');

    securityLogger.securityEvent('LOGOUT_ALL_DEVICES', {
      userId: req.user.id,
      ip: req.ip,
    });

    new ApiResponse(200, null, 'All sessions terminated').send(res);
  })
);

module.exports = router;
