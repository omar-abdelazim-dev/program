import cloudinary from '../config/cloudinary.js';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import path from 'path';
import logger from '../utils/logger.js';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_DOCUMENT_EXTENSIONS,
} from '../config/security.js';

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
export const getVideoUploadSignature = async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'program/lessons';
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
    res.status(200).json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    logger.error('Could not prepare video upload', { error: error.message });
    res.status(500).json({ message: 'Could not prepare video upload' });
  }
};

// @route   POST /api/uploads/image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was provided' });
    }

    // 1. Magic-byte validation
    const detectedType = await fileTypeFromBuffer(req.file.buffer);
    
    // Default to the multer-validated extension if no magic bytes found,
    // BUT we will reject it if file-type cannot detect it.
    if (!detectedType) {
      logger.warn('Image upload rejected: Unknown magic bytes', {
        endpoint: '/api/uploads/image',
        userId: req.user?._id,
        claimedMime: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      });
      return res.status(400).json({ message: 'Invalid or unsupported file format' });
    }

    const { mime, ext } = detectedType;
    const originalExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    if (!ALLOWED_IMAGE_MIMES.has(mime) || !ALLOWED_IMAGE_EXTENSIONS.has(`.${ext}`)) {
      logger.warn('Image upload rejected: Magic byte mismatch against allowlist', {
        endpoint: '/api/uploads/image',
        userId: req.user?._id,
        detectedMime: mime,
        detectedExt: ext,
        claimedMime: req.file.mimetype,
        filename: req.file.originalname
      });
      return res.status(400).json({ message: 'Invalid or unsupported file format' });
    }

    if (mime !== req.file.mimetype || ext !== originalExt) {
      logger.warn('Image upload rejected: Mime/Extension spoofing detected', {
        endpoint: '/api/uploads/image',
        userId: req.user?._id,
        detectedMime: mime,
        claimedMime: req.file.mimetype,
        detectedExt: ext,
        claimedExt: originalExt
      });
      return res.status(400).json({ message: 'Invalid or spoofed file type' });
    }

    // 2. Image Security with Sharp (Decode, strip metadata, re-encode)
    let safeBuffer;
    try {
      // Re-encode image to normalize it and strip EXIF data / polyglot scripts
      safeBuffer = await sharp(req.file.buffer)
        // Auto-orient based on EXIF (if needed) then strip all metadata
        .rotate()
        // Determine the output format dynamically based on the validated extension
        .toFormat(ext === 'jpg' ? 'jpeg' : ext, { quality: 85 })
        .toBuffer();
    } catch (sharpError) {
      logger.warn('Image upload rejected: Sharp decoding failed (possible corrupted or malformed payload)', {
        endpoint: '/api/uploads/image',
        userId: req.user?._id,
        error: sharpError.message,
        filename: req.file.originalname
      });
      return res.status(400).json({ message: 'Image decoding failed or corrupted image' });
    }

    const result = await streamUpload(safeBuffer, {
      resource_type: 'image',
      folder: 'program/thumbnails',
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    logger.error('Image upload failed', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Image upload failed' });
  }
};

// @route   POST /api/uploads/document
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file was provided' });
    }

    // 1. Magic-byte validation for supported documents
    // Note: file-type supports pdf, zip, rar, docx. It does not support plaintext or basic csv.
    // If it's a plaintext or CSV, file-type might return undefined.
    const detectedType = await fileTypeFromBuffer(req.file.buffer);
    
    // We only enforce strict magic bytes for binary formats.
    const binaryFormats = new Set(['.pdf', '.zip', '.rar', '.doc', '.docx']);
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (binaryFormats.has(ext)) {
      if (!detectedType) {
        logger.warn('Document upload rejected: Missing magic bytes for binary format', {
          endpoint: '/api/uploads/document',
          userId: req.user?._id,
          claimedMime: req.file.mimetype,
          filename: req.file.originalname
        });
        return res.status(400).json({ message: 'Invalid document format' });
      }
      
      const detectedExt = `.${detectedType.ext}`;
      if (!ALLOWED_DOCUMENT_MIMES.has(detectedType.mime) || !ALLOWED_DOCUMENT_EXTENSIONS.has(detectedExt)) {
        logger.warn('Document upload rejected: Magic bytes not in allowlist', {
          endpoint: '/api/uploads/document',
          userId: req.user?._id,
          detectedMime: detectedType.mime,
          claimedMime: req.file.mimetype,
          filename: req.file.originalname
        });
        return res.status(400).json({ message: 'Invalid or unsupported document format' });
      }
      
      // Some file types like docx are actually ZIPs, so file-type might detect 'application/zip' and 'zip'.
      // We allow mismatch here if the detected type is a generic container like zip, but we block spoofing for strict types like PDF.
      if (detectedExt === '.pdf' && detectedType.mime !== req.file.mimetype) {
         logger.warn('Document upload rejected: PDF spoofing detected', {
          endpoint: '/api/uploads/document',
          userId: req.user?._id,
          detectedMime: detectedType.mime,
          claimedMime: req.file.mimetype,
          filename: req.file.originalname
        });
        return res.status(400).json({ message: 'Invalid or spoofed file type' });
      }
    }

    const result = await streamUpload(req.file.buffer, {
      resource_type: 'raw', 
      folder: 'program/documents',
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    logger.error('Document upload failed', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Document upload failed' });
  }
};
