import multer from 'multer';

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
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
}).single('image'); // expects the form field to be named "image"

export const uploadDocumentFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for documents like PDF, doc, zip
  fileFilter: (req, file, cb) => {
    // We can be more permissive here, just rejecting video/image if we want, or restrict to docs
    if (file.mimetype.startsWith('video/')) {
      return cb(new Error('Videos should be uploaded via the video endpoint'));
    }
    cb(null, true);
  },
}).single('document'); // expects the form field to be named "document"
