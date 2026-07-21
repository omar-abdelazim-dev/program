'use strict';

/**
 * @file utils/clamav.js
 * ClamAV virus scanning integration using clamscan.
 * Requires clamd to be running locally or via network.
 */

const NodeClam = require('clamscan');
const { securityLogger } = require('./logger');

let clamscanInstance = null;

// Initialize ClamAV
const initClamAV = async () => {
  try {
    clamscanInstance = await new NodeClam().init({
      removeInfected: false, // We'll handle quarantine manually
      quarantineInfected: false,
      scanLog: null, // We'll use our security logger
      debugMode: false,
      fileList: null,
      scanRecursively: true,
      clamdscan: {
        host: process.env.CLAMAV_HOST || 'localhost',
        port: process.env.CLAMAV_PORT || 3310,
        timeout: 60000,
        localFallback: false,
        active: true,
      },
      preference: 'clamdscan', // Use clamdscan daemon instead of clamscan binary
    });
    securityLogger.info('ClamAV initialized successfully');
  } catch (err) {
    // If ClamAV isn't running, we log it. We might still allow uploads in dev,
    // but in enterprise prod, you should fail-close if AV is required.
    securityLogger.error('ClamAV initialization failed', { error: err.message });
  }
};

/**
 * Scan a file using ClamAV.
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<{ isInfected: boolean, viruses: string[] }>}
 */
const scanFile = async (filePath) => {
  if (!clamscanInstance) {
    if (process.env.NODE_ENV === 'production') {
      // Fail closed in production if AV is down
      throw new Error('Virus scanner is currently unavailable');
    }
    // Fail open in dev if AV is not configured
    securityLogger.warn('ClamAV is not initialized, skipping scan', { filePath });
    return { isInfected: false, viruses: [] };
  }

  try {
    const { isInfected, viruses } = await clamscanInstance.isInfected(filePath);
    return { isInfected, viruses: viruses || [] };
  } catch (err) {
    securityLogger.error('ClamAV scan error', { error: err.message, filePath });
    throw new Error('Failed to scan file for viruses');
  }
};

// Initialize asynchronously on boot
initClamAV();

module.exports = {
  scanFile,
};
