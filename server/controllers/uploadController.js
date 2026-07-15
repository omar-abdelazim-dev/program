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

// @route   POST /api/uploads/video
// @access  Private (instructor only)
// Expects multipart/form-data with a field named "video" (see middleware/upload.js)
export const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file was provided' });
    }

    const result = await streamUpload(req.file.buffer, {
      resource_type: 'video', // tells Cloudinary to run its video pipeline (transcoding, thumbnails, etc.)
      folder: 'program/lessons',
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Video upload failed' });
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
