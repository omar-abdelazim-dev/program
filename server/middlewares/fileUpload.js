'use strict';

/**
 * @file middlewares/fileUpload.js
 * Secure multer configuration factory.
 *
 * Security controls applied:
 *  1. MIME type validation via fileFilter (allowlist only)
 *  2. File extension validation (blocklist)
 *  3. File size limits per category
 *  4. Random UUID filenames (original names never used)
 *  5. Files stored OUTSIDE the public directory (uploads/ at project root)
 *  6. Executable file blocking
 *  7. Enterprise ClamAV virus scanning (via scanUploads middleware)
 *
 * OWASP ASVS §12 — File and Resource Requirements
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { generateFilename } = require('../utils/generateFilename');
const { createFileFilter, getSizeLimit } = require('../validators/file.validator');
const { scanFile } = require('../utils/clamav');
const { securityLogger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads'); // Outside public/
const QUARANTINE_BASE = path.resolve(process.cwd(), 'quarantine'); // Infected files

// Ensure directories exist
if (!fsSync.existsSync(UPLOAD_BASE)) fsSync.mkdirSync(UPLOAD_BASE, { recursive: true });
if (!fsSync.existsSync(QUARANTINE_BASE)) fsSync.mkdirSync(QUARANTINE_BASE, { recursive: true });

/**
 * Create a configured multer instance.
 */
const createUploader = ({
  allowedCategories = ['image'],
  destination = 'general',
  maxSizeMB,
  maxFiles = 1,
} = {}) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_BASE, destination);
      if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, generateFilename(file.originalname));
    },
  });

  const primaryCategory = allowedCategories[0] || 'image';
  const sizeLimit = maxSizeMB
    ? maxSizeMB * 1024 * 1024
    : getSizeLimit(primaryCategory);

  return multer({
    storage,
    fileFilter: createFileFilter(allowedCategories),
    limits: {
      fileSize: sizeLimit,
      files: maxFiles,
      fields: 20,
      fieldSize: 1024 * 100,
    },
  });
};

// ── Virus Scanning Middleware ───────────────────────────────────────────────

/**
 * Express middleware to scan uploaded files via ClamAV.
 * Must be placed immediately after the multer middleware in route definitions.
 */
const scanUploads = async (req, res, next) => {
  const filesToScan = [];
  if (req.file) filesToScan.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) filesToScan.push(...req.files);
    else Object.values(req.files).forEach((arr) => filesToScan.push(...arr));
  }

  if (filesToScan.length === 0) return next();

  try {
    for (const file of filesToScan) {
      const { isInfected, viruses } = await scanFile(file.path);

      if (isInfected) {
        const quarantinePath = path.join(QUARANTINE_BASE, path.basename(file.path));
        
        // Move to quarantine, or delete if move fails
        await fs.rename(file.path, quarantinePath).catch(() => fs.unlink(file.path).catch(() => {}));
        
        securityLogger.securityEvent('VIRUS_DETECTED', {
          originalName: file.originalname,
          viruses,
          ip: req.ip,
          userId: req.user?.id,
        });

        // Delete any other safe files uploaded in the same request
        for (const safeFile of filesToScan) {
          if (safeFile.path !== file.path) {
            await fs.unlink(safeFile.path).catch(() => {});
          }
        }

        return next(ApiError.badRequest(`File rejected: Virus detected (${viruses.join(', ')})`));
      }
    }
    next();
  } catch (err) {
    // If scanner fails (e.g. clamd is down), fail the upload in enterprise setups
    securityLogger.error('SCAN_FAILED_UPLOAD_BLOCKED', { error: err.message });
    // Clean up files since scan couldn't complete
    for (const file of filesToScan) await fs.unlink(file.path).catch(() => {});
    return next(ApiError.internal('File scanning service unavailable'));
  }
};

// ── Pre-configured uploaders for common use cases ─────────────────────────

const avatarUpload = createUploader({
  allowedCategories: ['image'],
  destination: 'avatars',
  maxSizeMB: 2,
  maxFiles: 1,
});

const courseImageUpload = createUploader({
  allowedCategories: ['image'],
  destination: 'courses/images',
  maxSizeMB: 5,
  maxFiles: 1,
});

const courseVideoUpload = createUploader({
  allowedCategories: ['video'],
  destination: 'courses/videos',
  maxFiles: 1,
});

const documentUpload = createUploader({
  allowedCategories: ['document'],
  destination: 'documents',
  maxFiles: 3,
});

module.exports = {
  createUploader,
  scanUploads,
  avatarUpload,
  courseImageUpload,
  courseVideoUpload,
  documentUpload,
  UPLOAD_BASE,
  QUARANTINE_BASE,
};
