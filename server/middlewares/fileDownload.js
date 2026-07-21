'use strict';

/**
 * @file middlewares/fileDownload.js
 * Sprint 2 — File Download Security.
 *
 * Implements:
 *  - Authorization check before any file is served
 *  - Directory traversal prevention
 *  - Correct Content-Disposition headers
 *  - Hotlinking prevention (Referer check in production)
 *  - Signed download URLs with expiry (HMAC-based)
 *  - Content-Type validation for served files
 *
 * Files are stored OUTSIDE public/ (as established in Sprint 1).
 * This middleware is the ONLY way to reach files in uploads/.
 *
 * OWASP ASVS §12.3 — File Execution Requirements
 */

const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { securityLogger } = require('../utils/logger');

const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads');
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || process.env.COOKIE_SECRET || 'fallback-dev-secret';
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

// ── Safe MIME types for download ───────────────────────────────────────────
const SAFE_MIME_MAP = {
  '.pdf':  'application/pdf',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
};

// ── Signed URL generation ──────────────────────────────────────────────────

/**
 * Generate a time-limited signed download URL.
 * @param {string} filePath  - Relative path within uploads/ (e.g. 'documents/abc.pdf')
 * @param {string} userId    - Requesting user's ID
 * @param {number} [ttl]     - TTL in seconds (default: 300)
 * @returns {{ url: string, expires: number }}
 */
const generateSignedUrl = (filePath, userId, ttl = SIGNED_URL_TTL_SECONDS) => {
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${filePath}:${userId}:${expires}`;
  const signature = crypto
    .createHmac('sha256', DOWNLOAD_SECRET)
    .update(payload)
    .digest('hex');

  return {
    url: `/api/v1/files/download?file=${encodeURIComponent(filePath)}&uid=${userId}&exp=${expires}&sig=${signature}`,
    expires,
  };
};

/**
 * Verify a signed download URL.
 * @param {string} filePath
 * @param {string} userId
 * @param {string} expires   - Unix timestamp string
 * @param {string} signature
 * @returns {boolean}
 */
const verifySignedUrl = (filePath, userId, expires, signature) => {
  const now = Math.floor(Date.now() / 1000);
  if (parseInt(expires, 10) < now) return false; // Expired

  const payload = `${filePath}:${userId}:${expires}`;
  const expected = crypto
    .createHmac('sha256', DOWNLOAD_SECRET)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

// ── Middleware: serve file safely ──────────────────────────────────────────

/**
 * Secure file download handler.
 *
 * Expects query params: file, uid, exp, sig
 * OR: called directly from a route with req.filePath set.
 *
 * Verifies:
 *  1. Signed URL validity
 *  2. User is authenticated (req.user must be set by authenticate middleware)
 *  3. uid in URL matches authenticated user (or admin bypass)
 *  4. File is within uploads/ (directory traversal prevention)
 *  5. File exists
 *  6. Sets correct Content-Disposition and Content-Type headers
 */
const secureDownload = asyncHandler(async (req, res, next) => {
  const { file: filePath, uid, exp, sig } = req.query;

  if (!filePath || !uid || !exp || !sig) {
    throw ApiError.badRequest('Missing required download parameters');
  }

  // ── 1. Verify signed URL ─────────────────────────────────────────────
  let isValid;
  try {
    isValid = verifySignedUrl(filePath, uid, exp, sig);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    securityLogger.securityEvent('INVALID_SIGNED_URL', {
      ip: req.ip,
      filePath,
      userId: req.user?.id,
    });
    throw ApiError.forbidden('Download link is invalid or has expired');
  }

  // ── 2. Verify authenticated user matches uid ─────────────────────────
  if (!req.user) throw ApiError.unauthorized('Authentication required');

  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  if (!isAdmin && req.user.id !== uid) {
    securityLogger.securityEvent('DOWNLOAD_OWNERSHIP_MISMATCH', {
      requestingUser: req.user.id,
      urlUser: uid,
      ip: req.ip,
    });
    throw ApiError.forbidden('Access denied');
  }

  // ── 3. Prevent directory traversal ──────────────────────────────────
  const decodedPath = decodeURIComponent(filePath);
  const absolutePath = path.resolve(UPLOAD_BASE, decodedPath);

  if (!absolutePath.startsWith(UPLOAD_BASE + path.sep)) {
    securityLogger.securityEvent('DIRECTORY_TRAVERSAL_ATTEMPT', {
      ip: req.ip,
      filePath,
      resolvedPath: absolutePath,
      userId: req.user.id,
    });
    throw ApiError.forbidden('Access denied');
  }

  // ── 4. Verify file exists ────────────────────────────────────────────
  if (!fs.existsSync(absolutePath)) {
    throw ApiError.notFound('File not found');
  }

  // ── 5. Determine Content-Type ────────────────────────────────────────
  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = SAFE_MIME_MAP[ext];

  if (!contentType) {
    securityLogger.securityEvent('UNSAFE_FILE_TYPE_DOWNLOAD', {
      ip: req.ip,
      ext,
      userId: req.user.id,
    });
    throw ApiError.forbidden('File type not allowed for download');
  }

  // ── 6. Anti-hotlinking (production only) ────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    const referer = req.headers['referer'] || '';
    const allowedOrigin = process.env.CORS_ORIGIN || '';
    if (referer && !referer.startsWith(allowedOrigin)) {
      securityLogger.securityEvent('HOTLINK_ATTEMPT', {
        ip: req.ip,
        referer,
        filePath,
      });
      throw ApiError.forbidden('Direct file access is not allowed');
    }
  }

  // ── 7. Serve the file ────────────────────────────────────────────────
  const filename = path.basename(absolutePath);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');

  res.sendFile(absolutePath, (err) => {
    if (err) {
      securityLogger.error('FILE_SEND_ERROR', { filePath, error: err.message });
      if (!res.headersSent) next(ApiError.internal('Failed to send file'));
    }
  });
});

module.exports = { secureDownload, generateSignedUrl, verifySignedUrl };
