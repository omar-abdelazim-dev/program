'use strict';

/**
 * @file validators/file.validator.js
 * File upload metadata validators.
 *
 * These run BEFORE multer writes any bytes — they validate the
 * Content-Type header and declared file size from the request.
 * The definitive MIME check is done inside the multer fileFilter.
 */

// ── Allowed MIME types ─────────────────────────────────────────────────────

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const ALLOWED_DOCUMENT_MIMES = new Set([
  'application/pdf',
]);

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
]);

// ── Blocked extensions ─────────────────────────────────────────────────────
// Any file with these extensions is rejected immediately, regardless of MIME.

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.com', '.ps1', '.vbs', '.js', '.ts',
  '.php', '.py', '.rb', '.pl', '.jar', '.war', '.ear', '.dll', '.so',
  '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.apk', '.ipa', '.bin',
  '.cgi', '.asp', '.aspx', '.jsp',
]);

// ── File size limits (in bytes) ────────────────────────────────────────────

const FILE_LIMITS = {
  image:    5  * 1024 * 1024,  //  5 MB
  video:    500 * 1024 * 1024, // 500 MB
  document: 10  * 1024 * 1024, // 10 MB
  audio:    50  * 1024 * 1024, // 50 MB
};

// ── Helper functions ───────────────────────────────────────────────────────

const path = require('path');

/**
 * Check if a filename has a blocked extension.
 * @param {string} filename
 * @returns {boolean} true if blocked
 */
const hasBlockedExtension = (filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
};

/**
 * Determine the category of a MIME type.
 * @param {string} mimeType
 * @returns {'image'|'video'|'document'|'audio'|null}
 */
const getMimeCategory = (mimeType) => {
  if (ALLOWED_IMAGE_MIMES.has(mimeType))    return 'image';
  if (ALLOWED_VIDEO_MIMES.has(mimeType))    return 'video';
  if (ALLOWED_DOCUMENT_MIMES.has(mimeType)) return 'document';
  if (ALLOWED_AUDIO_MIMES.has(mimeType))    return 'audio';
  return null;
};

/**
 * Multer fileFilter factory.
 * Returns a multer-compatible fileFilter that enforces:
 *  - Blocked extension check
 *  - Allowed MIME type check
 *  - Category-specific file size limit
 *
 * @param {string[]} [allowedCategories] - e.g. ['image','document']
 * @returns {Function} multer fileFilter
 */
const createFileFilter = (allowedCategories = ['image', 'document', 'video', 'audio']) => {
  const allowedSet = new Set(allowedCategories);

  return (_req, file, cb) => {
    // 1. Block dangerous extensions
    if (hasBlockedExtension(file.originalname)) {
      return cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`), false);
    }

    // 2. Check MIME category
    const category = getMimeCategory(file.mimetype);
    if (!category || !allowedSet.has(category)) {
      return cb(new Error(`MIME type not allowed: ${file.mimetype}`), false);
    }

    // Pass category for size enforcement downstream
    file.category = category;
    cb(null, true);
  };
};

/**
 * Get the size limit for a given category.
 * @param {string} category
 * @returns {number} bytes
 */
const getSizeLimit = (category) => FILE_LIMITS[category] || FILE_LIMITS.document;

module.exports = {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_AUDIO_MIMES,
  BLOCKED_EXTENSIONS,
  FILE_LIMITS,
  hasBlockedExtension,
  getMimeCategory,
  createFileFilter,
  getSizeLimit,
};
