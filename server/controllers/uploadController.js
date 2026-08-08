import cloudinary from '../config/cloudinary.js';

// Cloudinary's SDK is callback-based for streaming uploads — we wrap it in a
// Promise so the controllers below can just use async/await like everywhere
// else in this codebase, rather than mixing callback and async styles.
const streamUpload = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

// @route   GET /api/uploads/video-signature
// @access  Private (instructor only)
// Videos upload directly from the browser to Cloudinary instead of buffering
// through this server (see PR discussion — large videos were sitting fully
// in Node memory before being re-uploaded, which doesn't scale). This
// endpoint just signs the params the browser needs to be trusted by
// Cloudinary; the actual bytes never touch our backend.
export const getVideoUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'program/lessons';

    // Signing exactly these params means Cloudinary rejects the upload if the
    // browser tries to send it anywhere other than this folder — the
    // signature is a hash of (params + our secret), so tampering with folder
    // client-side invalidates it.
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not prepare video upload' });
  }
};

// @route   POST /api/uploads/image
// @access  Private (instructor only)
// Expects multipart/form-data with a field named "image"
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was provided' });
    }

    const result = await streamUpload(req.file.buffer, {
      resource_type: 'image',
      folder: 'program/thumbnails',
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Image upload failed' });
  }
};

// @route   POST /api/uploads/document
// @access  Private (instructor only)
// Expects multipart/form-data with a field named "document"
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file was provided' });
    }

    const result = await streamUpload(req.file.buffer, {
      resource_type: 'raw', // required for non-media files like PDFs
      folder: 'program/documents',
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Document upload failed' });
  }
};
