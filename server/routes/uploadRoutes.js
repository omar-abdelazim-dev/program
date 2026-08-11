import express from 'express';
import { getVideoUploadSignature, uploadImage, uploadDocument } from '../controllers/uploadController.js';
import { uploadImageFile, uploadDocumentFile, handleMulterError } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Videos go straight from the browser to Cloudinary — this just hands out a
// signed set of upload params, it never sees the file itself.
router.get(
  '/video-signature',
  uploadLimiter,
  protect,
  authorize('instructor'),
  getVideoUploadSignature
);

// No authorize('instructor') here (unlike /video) — this endpoint is also
// used by any logged-in user to upload a profile picture from Settings, not
// just instructors uploading course thumbnails.
router.post(
  '/image',
  uploadLimiter,
  protect,
  uploadImageFile,
  handleMulterError,
  uploadImage
);

router.post(
  '/document',
  uploadLimiter,
  protect,
  authorize('instructor'),
  uploadDocumentFile,
  handleMulterError,
  uploadDocument
);

export default router;
