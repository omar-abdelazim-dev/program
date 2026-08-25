import SystemConfig from '../models/SystemConfig.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import StandaloneLesson from '../models/StandaloneLesson.js';
import User from '../models/User.js';

import { getInternalConfig, clearConfigCache } from '../utils/configFetcher.js';
import logger from '../utils/logger.js';
import * as emailService from '../utils/emailService.js';
import { normalizeLandingPageSocial } from '../utils/socialUrlValidation.js';
import cloudinary from '../config/cloudinary.js';

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

// @route   GET /api/system/storage-stats
// @access  Private (Admin / Super Admin)
export const getStorageStats = async (req, res) => {
  try {
    const lessonVideos = await Lesson.countDocuments({ videoUrl: { $exists: true, $ne: '' } });
    const standaloneVideos = await StandaloneLesson.countDocuments({ videoUrl: { $exists: true, $ne: '' } });
    const videoCount = lessonVideos + standaloneVideos;

    const courseThumbnails = await Course.countDocuments({ thumbnailUrl: { $exists: true, $ne: '' } });
    const lessonThumbnails = await Lesson.countDocuments({ thumbnailUrl: { $exists: true, $ne: '' } });
    const standaloneThumbnails = await StandaloneLesson.countDocuments({ thumbnailUrl: { $exists: true, $ne: '' } });
    const thumbnailCount = courseThumbnails + lessonThumbnails + standaloneThumbnails;

    const avatarCount = await User.countDocuments({ avatarUrl: { $exists: true, $ne: '' } });
    const attachmentCount = await Lesson.countDocuments({ attachmentUrl: { $exists: true, $ne: '' } });

    const realMediaFiles = videoCount + thumbnailCount + avatarCount + attachmentCount;

    const config = await getGlobalConfig();
    const maxUploadMb = config.storage?.maxUploadSizeMb || 50;

    res.json({
      videoCount,
      thumbnailCount,
      avatarCount,
      totalMediaFiles: realMediaFiles,
      usedMb: null,
      usedGb: null,
      availableGb: null,
      totalCapacityGb: null,
      usagePercent: null,
      provider: 'Cloudinary',
      maxUploadMb
    });
  } catch (err) {
    logger.error('Error fetching storage stats', { error: err.message });
    res.status(500).json({ message: 'Server error retrieving storage statistics' });
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
      appearance: config.appearance,
      features: config.features,
      registration: {
        studentRegistration: config.registration?.studentRegistration ?? true,
        instructorRegistration: config.registration?.instructorRegistration ?? true
      },
      payment: {
        currency: config.financial?.currency || 'EGP',
        instaPayEnabled: config.financial?.instaPayEnabled ?? true,
        mobileWalletEnabled: config.financial?.mobileWalletEnabled ?? true,
        instaPayAccount: config.financial?.instaPayAccount || '',
        mobileWalletNumber: config.financial?.mobileWalletNumber || '',
        manualPaymentInstructions: config.financial?.manualPaymentInstructions || '',
        companyPhone: config.financial?.companyPhone || '',
        companyInstaPayAccount: config.financial?.companyInstaPayAccount || '',
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
    
    const restrictedSections = ['financial', 'security', 'registration', 'api', 'features', 'ai', 'audit', 'maintenance', 'backup', 'landingPage'];

    // Enforce superadmin role for restricted sections
    if (restrictedSections.includes(section) && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super Admin permission required to modify this section.' });
    }

    const config = await getGlobalConfig();

    // Only expose persisted sections that have a corresponding schema and UI.
    const validSections = [
      'general',
      'financial',
      'registration',
      'security',
      'storage',
      'notifications',
      'appearance',
      'maintenance',
      'backup',
      'landingPage',
    ];
    if (!config.get(section) && validSections.includes(section)) {
        config.set(section, {});
    }

    if (!config.get(section)) {
      return res.status(400).json({ message: 'Invalid configuration section' });
    }

    // Keep old values for audit logging
    const sectionData = config.get(section);
    const oldValues = { ...(sectionData.toObject ? sectionData.toObject() : sectionData) };

    // Mirror the UI's standard-admin permissions on the server. Client-side
    // disabled controls are not an authorization boundary.
    const adminWritableFields = {
      general: ['contactEmail', 'supportEmail', 'homepageAnnouncement'],
      storage: [],
      notifications: ['studentEmails', 'instructorEmails', 'adminAlerts', 'marketingEmails'],
      appearance: ['defaultTheme', 'accentColor', 'landingBanner', 'footerInfo'],
    };
    if (req.user.role === 'admin') {
      const allowedFields = adminWritableFields[section] || [];
      const forbiddenField = Object.keys(updates).find(
        (field) => !allowedFields.includes(field),
      );
      if (forbiddenField) {
        return res.status(403).json({ message: 'Super Admin permission required to modify this setting.' });
      }
    }
    
    // Apply updates
    // For nested schema structures like 'landingPage' which contain multiple nested objects,
    // use config.set() so Mongoose registers the top-level paths as modified.
    if (section === 'landingPage') {
      const landingPageUpdates = { ...updates };

      if (updates.social !== undefined) {
        const normalizedSocial = normalizeLandingPageSocial(updates.social);
        if (!normalizedSocial) {
          return res.status(400).json({ message: 'Social links must use valid HTTPS URLs.' });
        }
        landingPageUpdates.social = { ...oldValues.social, ...normalizedSocial };
      }

      config.set(section, { ...oldValues, ...landingPageUpdates });
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

// @route   GET /api/system/config/storage/status
// @access  Private (Admin / Super Admin)
export const getStorageStatus = async (req, res) => {
  const config = await getGlobalConfig();
  const provider = 'Cloudinary';

  if (provider !== 'Cloudinary') {
    return res.json({ connected: false, provider, message: `${provider} is not configured by this deployment.` });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.json({ connected: false, provider, message: 'Cloudinary credentials are not configured on the server.' });
  }

  try {
    await cloudinary.api.ping();
    res.json({ connected: true, provider, message: 'Cloudinary connection verified.' });
  } catch (error) {
    logger.warn('Cloudinary connection check failed', { error: error.message });
    res.json({ connected: false, provider, message: 'Cloudinary connection could not be verified.' });
  }
};

// @route   GET /api/system/config/email/status
// @access  Private (Admin / Super Admin)
export const getEmailStatus = async (req, res) => {
  const status = await emailService.getEmailDeliveryStatus();
  res.json(status);
};

// @route   POST /api/system/config/email/test
// @access  Private (Admin / Super Admin)
export const sendTestEmail = async (req, res) => {
  try {
    const { recipient, format, content, rejectionReason } = req.body;
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(400).json({ message: 'SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not configured on the server.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    switch (content) {
      case 'otp_request':
        await emailService.sendOtpVerificationEmail({
          toEmail: recipient,
          account_email: recipient,
          otp_code: '123456',
          expiry_minutes: 10
        });
        break;
      case 'payout_request':
        await emailService.sendAdminNewRequestEmail({
          adminEmails: [{ email: recipient, name: 'Admin Tester' }],
          request_id: 'REQ-123456',
          request_type_label: 'New Payout Request',
          request_type_tag: 'PAYOUT',
          submitted_date: new Date().toLocaleDateString(),
          item_title: 'Instructor Payout - $1500',
          requester_name: 'Jane Doe',
          requester_role: 'Instructor',
          review_url: `${clientUrl}/admin/requests`,
          queue_url: `${clientUrl}/admin/requests`,
          settings_url: `${clientUrl}/admin/settings`
        });
        break;
      case 'course_request':
      case 'enroll_request':
        await emailService.sendAdminNewRequestEmail({
          adminEmails: [{ email: recipient, name: 'Admin Tester' }],
          request_id: 'REQ-654321',
          request_type_label: content === 'course_request' ? 'New Course Submission' : 'New Enrollment Request',
          request_type_tag: content === 'course_request' ? 'COURSE' : 'ENROLL',
          submitted_date: new Date().toLocaleDateString(),
          item_title: 'Advanced Masterclass',
          requester_name: content === 'course_request' ? 'Instructor Jane' : 'Student Bob',
          requester_role: content === 'course_request' ? 'Instructor' : 'Student',
          review_url: `${clientUrl}/admin/requests`,
          queue_url: `${clientUrl}/admin/requests`,
          settings_url: `${clientUrl}/admin/settings`
        });
        break;
      case 'course_approved':
        await emailService.sendCourseApprovedEmail({
          toEmail: recipient,
          instructor_name: 'Instructor Jane',
          course_title: 'Advanced Masterclass',
          course_category: 'Technology',
          approval_date: new Date().toLocaleDateString(),
          dashboard_url: `${clientUrl}/instructor/courses`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/instructor/settings`
        });
        break;
      case 'course_rejected':
        await emailService.sendCourseRejectedEmail({
          toEmail: recipient,
          instructor_name: 'Instructor Jane',
          course_title: 'Advanced Masterclass',
          rejection_reason: rejectionReason || 'Content did not meet the quality guidelines.',
          review_date: new Date().toLocaleDateString(),
          edit_course_url: `${clientUrl}/instructor/courses/edit`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/instructor/settings`
        });
        break;
      case 'payout_approved':
        await emailService.sendPayoutApprovedEmail({
          toEmail: recipient,
          instructor_name: 'Instructor Jane',
          payout_amount: '1,500.00',
          payout_method: 'Bank Transfer',
          payout_reference: 'PAY-10029',
          approval_date: new Date().toLocaleDateString(),
          arrival_estimate: '3-5 business days',
          invoice_code: 'INV-2026-0814',
          payment_time: new Date().toLocaleTimeString(),
          contact_number: '+1 (555) 123-4567',
          earnings_url: `${clientUrl}/instructor/earnings`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/instructor/settings`
        });
        break;
      case 'payout_rejected':
        await emailService.sendPayoutRejectedEmail({
          toEmail: recipient,
          instructor_name: 'Instructor Jane',
          payout_amount: '1,500.00',
          rejection_reason: rejectionReason || 'Invalid IBAN provided.',
          payout_reference: 'PAY-10029',
          review_date: new Date().toLocaleDateString(),
          invoice_code: 'INV-2026-0814',
          payment_time: new Date().toLocaleTimeString(),
          payment_method: 'Bank Transfer',
          contact_number: '+1 (555) 123-4567',
          payout_settings_url: `${clientUrl}/instructor/settings`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/instructor/settings`
        });
        break;
      case 'enroll_approved':
        await emailService.sendStudentEnrollApprovedEmail({
          toEmail: recipient,
          student_name: 'Student Bob',
          course_title: 'Advanced Masterclass',
          instructor_name: 'Instructor Jane',
          enrollment_date: new Date().toLocaleDateString(),
          invoice_code: 'INV-2026-0815',
          payment_time: new Date().toLocaleTimeString(),
          payment_method: 'Credit Card',
          contact_number: '**** **** **** 4242',
          course_url: `${clientUrl}/learn/123`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/student/settings`
        });
        break;
      case 'enroll_rejected':
        await emailService.sendStudentEnrollRejectedEmail({
          toEmail: recipient,
          student_name: 'Student Bob',
          course_title: 'Advanced Masterclass',
          rejection_reason: rejectionReason || 'Payment verification failed.',
          review_date: new Date().toLocaleDateString(),
          invoice_code: 'INV-2026-0815',
          payment_time: new Date().toLocaleTimeString(),
          payment_method: 'Credit Card',
          contact_number: '**** **** **** 4242',
          browse_courses_url: `${clientUrl}/courses`,
          help_url: `${clientUrl}/help`,
          settings_url: `${clientUrl}/student/settings`
        });
        break;
      default:
        await emailService.sendOtpVerificationEmail({
          toEmail: recipient,
          account_email: recipient,
          otp_code: '------',
          expiry_minutes: 0
        });
        break;
    }

    res.json({ message: 'Test email dispatched successfully', recipient, format, content, rejectionReason });
  } catch (err) {
    logger.error('Error sending test email', { error: err.message });
    res.status(500).json({ message: 'Failed to send test email. Please check server logs and SMTP configuration.' });
  }
};
