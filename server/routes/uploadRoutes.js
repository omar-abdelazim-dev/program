import express from 'express';
import { getVideoUploadSignature, uploadImage, uploadDocument } from '../controllers/uploadController.js';
import { uploadImageFile, uploadDocumentFile } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// multer's middleware calls next(err) on things like "file too large" or a
// rejected mimetype — by default that would fall through to our generic
// 500 error handler, which is confusing ("Something went wrong on the
// server" for what's really just "your file was too big"). This wrapper
// catches that and responds with a proper 400 instead.
const handleMulterErrors = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Videos go straight from the browser to Cloudinary — this just hands out a
// signed set of upload params, it never sees the file itself.
router.get(
  '/video-signature',
  protect,
  authorize('instructor'),
  getVideoUploadSignature
);

// No authorize('instructor') here (unlike /video) — this endpoint is also
// used by any logged-in user to upload a profile picture from Settings, not
// just instructors uploading course thumbnails.
router.post(
  '/image',
  protect,
  handleMulterErrors(uploadImageFile),
  uploadImage
);

router.post(
  '/document',
  protect,
  authorize('instructor'),
  handleMulterErrors(uploadDocumentFile),
  uploadDocument
);

export default router;
