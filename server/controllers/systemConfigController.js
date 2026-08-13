import SystemConfig from '../models/SystemConfig.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';

import { getInternalConfig, clearConfigCache } from '../utils/configFetcher.js';
import logger from '../utils/logger.js';

// Helper to get or create the global config
const getGlobalConfig = async () => {
  let config = await SystemConfig.findOne({ isGlobal: true });
  if (!config) {
    config = await SystemConfig.create({ isGlobal: true });
  }
  return config;
};

// @route   GET /api/system/config
// @access  Private (Admin / Super Admin)
export const getConfig = async (req, res) => {
  try {
    const config = await getGlobalConfig();
    res.json(config);
  } catch (err) {
    logger.error('An error occurred', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error retrieving system configuration' });
  }
};

// @route   GET /api/system/config/public
// @access  Public
export const getPublicConfig = async (req, res) => {
  try {
    const config = await getGlobalConfig();
    // Only send safe frontend configuration settings
    res.json({
      general: config.general,
      features: config.features,
      registration: {
        studentRegistration: config.registration?.studentRegistration ?? true,
        instructorRegistration: config.registration?.instructorRegistration ?? true
      },
      landingPage: config.landingPage
    });
  } catch (err) {
    logger.error('An error occurred', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error retrieving public configuration' });
  }
};

// @route   PATCH /api/system/config/:section
// @access  Private
export const updateConfigSection = async (req, res) => {
  try {
    const { section } = req.params;
    const updates = req.body;
    
    // RBAC validation
    const isSuperAdmin = req.user.role === 'admin' && req.user.isSuperAdmin; // Assuming isSuperAdmin is a boolean on the User model, or we can just mock it as if role === 'admin' and they pass a header. Wait, in this app, there is only 'admin' role. The prompt asked to enforce permissions through backend authorization.
    // Since we don't have isSuperAdmin on User model yet, we'll assume req.user.isSuperAdmin exists, or we check if they are trying to update restricted sections.
    // For MVP, we will allow 'admin' to update 'general', 'appearance', 'notifications' without being super admin.
    
    const restrictedSections = ['financial', 'security', 'registration', 'api', 'features', 'ai', 'audit', 'maintenance', 'backup', 'landingPage'];

    // Enforce superadmin role for restricted sections
    if (restrictedSections.includes(section) && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super Admin permission required to modify this section.' });
    }

    const config = await getGlobalConfig();

    // Initialize section if missing but valid in schema
    // (ADM-14: email/notifications/appearance removed — those tabs no longer exist)
    const validSections = ['general', 'financial', 'registration', 'security', 'storage', 'landingPage'];
    if (!config.get(section) && validSections.includes(section)) {
        config.set(section, {});
    }

    if (!config.get(section)) {
      return res.status(400).json({ message: 'Invalid configuration section' });
    }

    // Keep old values for audit logging
    const sectionData = config.get(section);
    const oldValues = { ...(sectionData.toObject ? sectionData.toObject() : sectionData) };
    
    // Apply updates
    // For nested schema structures like 'landingPage' which contain multiple nested objects
    // (hero, story, paths, colors), we need to do a shallow merge of the top-level keys
    // to ensure Mongoose accurately registers the paths as modified using config.set()
    if (section === 'landingPage') {
      config.set(section, { ...oldValues, ...updates });
    } else {
      for (const key in updates) {
        if (typeof updates[key] !== 'undefined') {
          sectionData[key] = updates[key];
        }
      }
    }
    
    await config.save();
    clearConfigCache(); // Clear the internal cache so the backend picks up the new setting immediately

    // Create Audit Log
    const newSectionData = config.get(section);
    await AuditLog.create({
      action: `Updated ${section} configuration`,
      changedBy: req.user.id,
      oldValue: oldValues,
      newValue: typeof newSectionData.toObject === 'function' ? newSectionData.toObject() : newSectionData,
      module: 'System Management',
    });

    res.json(config);
  } catch (err) {
    logger.error('An error occurred', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error updating configuration' });
  }
};

// @route   POST /api/system/config/financial/preview
// @access  Private (Super Admin)
export const previewFinancials = async (req, res) => {
  try {
    // Enforce superadmin role
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super Admin permission required.' });
    }

    const { commission } = req.body;
    
    if (commission === undefined || commission < 0 || commission > 100) {
      return res.status(400).json({ message: 'Invalid commission percentage' });
    }

    // Calculate total revenue from enrollments
    const result = await Enrollment.aggregate([
      { $group: { 
          _id: null, 
          total: { $sum: "$amountPaid" },
          companyShare: { $sum: "$platformCommission" },
          instructorShare: { $sum: "$instructorShare" }
        } 
      }
    ]);
    const totalRevenue = result[0]?.total || 0;
    const companyShare = result[0]?.companyShare || 0;
    const instructorShare = result[0]?.instructorShare || 0;

    res.json({
      platformCommission: commission,
      totalRevenue,
      companyShare,
      instructorShare
    });

  } catch (err) {
    logger.error('An error occurred', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error generating financial preview' });
  }
};
