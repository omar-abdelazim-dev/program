import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_VIDEO_EXTENSIONS,
} from '../config/security.js';

// We use memory storage (not disk storage) because we're immediately
// streaming the file to Cloudinary — there's no reason to write it to disk
// on our own server first, which also means no cleanup/tmp-file management.
const storage = multer.memoryStorage();

/**
 * Attaches a UUID-based safe filename to req.safeFilename for logging purposes.
 * The original filename is NEVER used — it is untrusted user input and could
 * contain path traversal characters, null bytes, or extremely long strings.
 * Cloudinary generates its own public_id, so this only matters for our logs.
 */
const assignSafeFilename = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return `${uuidv4()}${ext}`;
};

// Separate limits for video vs image so a 2MB thumbnail upload doesn't
// accidentally get a 500MB ceiling, and a course video isn't stuck at 5MB.
// Upload size limits are a business decision and are preserved as-is.
export const uploadVideoFile = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB — generous for lecture-length video
  fileFilter: (req, file, cb) => {
    // Layer 1: MIME type check (same as before)
    if (!ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
      return cb(new Error('Only video files are allowed'));
    }
    // Layer 2: Extension whitelist (defence-in-depth — MIME can be spoofed by clients)
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
      return cb(new Error(`File extension '${ext}' is not allowed for video uploads`));
    }
    // Assign a UUID-based safe filename (used for logging; Cloudinary uses its own id)
    req.safeFilename = assignSafeFilename(file);
    cb(null, true);
  },
}).single('video'); // expects the form field to be named "video"

export const uploadImageFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a course thumbnail
  fileFilter: (req, file, cb) => {
    // Layer 1: MIME type check (same as before)
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    // Layer 2: Extension whitelist
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return cb(new Error(`File extension '${ext}' is not allowed for image uploads`));
    }
    // Assign a UUID-based safe filename
    req.safeFilename = assignSafeFilename(file);
    cb(null, true);
  },
}).single('image'); // expects the form field to be named "image"

