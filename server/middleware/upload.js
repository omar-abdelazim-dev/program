import multer from 'multer';
import path from 'path';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_DOCUMENT_EXTENSIONS
} from '../config/security.js';

// We use memory storage (not disk storage) because we're immediately
// streaming the file to Cloudinary — there's no reason to write it to disk
// on our own server first, which also means no cleanup/tmp-file management.
const storage = multer.memoryStorage();

// Video no longer goes through Multer/this server at all — it uploads
// directly from the browser to Cloudinary via a signed request (see
// controllers/uploadController.js#getVideoUploadSignature).

export const uploadImageFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a course thumbnail
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only approved image MIME types are allowed'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return cb(new Error('Only approved image extensions are allowed'));
    }
    cb(null, true);
  },
}).single('image'); // expects the form field to be named "image"

export const uploadDocumentFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for documents like PDF, doc, zip
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOCUMENT_MIMES.has(file.mimetype)) {
      return cb(new Error('Only approved document MIME types are allowed'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
      return cb(new Error('Only approved document extensions are allowed'));
    }
    cb(null, true);
  },
}).single('document'); // expects the form field to be named "document"

// Graceful error handler for Multer size limits
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Payload Too Large: File exceeds the maximum allowed size.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    // Handle custom errors thrown from fileFilter
    return res.status(400).json({ message: err.message });
  }
  next();
};
