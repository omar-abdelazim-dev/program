import multer from 'multer';

// We use memory storage (not disk storage) because we're immediately
// streaming the file to Cloudinary — there's no reason to write it to disk
// on our own server first, which also means no cleanup/tmp-file management.
const storage = multer.memoryStorage();

// Separate limits for video vs image so a 2MB thumbnail upload doesn't
// accidentally get a 500MB ceiling, and a course video isn't stuck at 5MB.
export const uploadVideoFile = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB — generous for lecture-length video
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'));
    }
    cb(null, true);
  },
}).single('video'); // expects the form field to be named "video"

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
