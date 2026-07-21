import express from 'express';
import { uploadVideo, uploadImage } from '../controllers/uploadController.js';
import { uploadVideoFile, uploadImageFile } from '../middleware/upload.js';
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

router.post(
  '/video',
  protect,
  authorize('instructor'),
  handleMulterErrors(uploadVideoFile),
  uploadVideo
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

export default router;
