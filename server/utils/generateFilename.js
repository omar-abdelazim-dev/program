'use strict';

/**
 * @file utils/generateFilename.js
 * Generates a cryptographically random filename for uploaded files.
 * Original filenames from the client are NEVER used — this prevents
 * path traversal attacks and filename-based exploits.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Generate a random filename preserving only a safe, whitelisted extension.
 * @param {string} originalName - The client-provided filename.
 * @returns {string} e.g. "3f2b1a4e-uuid.jpg"
 */
const generateFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();

  const SAFE_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', // images
    '.pdf',                                             // documents
    '.mp4', '.webm', '.mov',                            // video
    '.mp3', '.wav',                                     // audio
  ]);

  const safeExt = SAFE_EXTENSIONS.has(ext) ? ext : '';
  return `${uuidv4()}${safeExt}`;
};

module.exports = { generateFilename };
