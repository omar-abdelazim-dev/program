'use strict';

/**
 * @file routes/file.routes.js
 * Sprint 2 — File Download Routes.
 *
 * GET /api/v1/files/download?file=...&uid=...&exp=...&sig=...
 *   — Validates signed URL and serves file securely
 *
 * POST /api/v1/files/signed-url
 *   — Generate a signed download URL for an authorised user
 */

const { Router } = require('express');
const router = Router();

const authenticate         = require('../middlewares/authenticate');
const asyncHandler         = require('../utils/asyncHandler');
const ApiResponse          = require('../utils/ApiResponse');
const ApiError             = require('../utils/ApiError');
const { secureDownload, generateSignedUrl } = require('../middlewares/fileDownload');

// GET /api/v1/files/download — serve a signed-URL download
router.get('/download', authenticate, secureDownload);

// POST /api/v1/files/signed-url — generate a signed URL
router.post(
  '/signed-url',
  authenticate,
  asyncHandler(async (req, res) => {
    const { filePath, ttl } = req.body;

    if (!filePath || typeof filePath !== 'string') {
      throw ApiError.badRequest('filePath is required');
    }

    // Sanitise: no traversal sequences
    const path = require('path');
    const normalised = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
    if (normalised !== filePath) {
      throw ApiError.badRequest('Invalid file path');
    }

    const { url, expires } = generateSignedUrl(
      filePath,
      req.user.id,
      ttl ? Math.min(parseInt(ttl, 10), 3600) : 300
    );

    new ApiResponse(200, { url, expires }, 'Signed URL generated').send(res);
  })
);

module.exports = router;
