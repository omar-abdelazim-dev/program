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

import nodemailer from 'nodemailer';

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    let subject = 'Test Email from Program';
    let title = 'Test Email';
    let bodyText = `This is a test email for the <strong>${content}</strong> template.`;
    let bgColor = '#3b82f6'; // default blue

    switch (content) {
      case 'otp_request':
        subject = 'Your Verification Code';
        title = 'Verification Code';
        bodyText = 'Use the code below to verify your request:<br><br><span style="font-size:2rem;font-weight:bold;letter-spacing:5px;">123456</span>';
        bgColor = '#3b82f6'; // blue
        break;
      case 'payout_request':
        subject = 'New Payout Request Received';
        title = 'Payout Request';
        bodyText = 'A new payout request has been submitted by an instructor and is pending admin approval.';
        bgColor = '#f59e0b'; // amber
        break;
      case 'enroll_request':
        subject = 'New Enrollment Request Received';
        title = 'Enrollment Request';
        bodyText = 'A student has requested to enroll in a course. Please review the request.';
        bgColor = '#f59e0b'; // amber
        break;
      case 'course_approved':
        subject = 'Your Course has been Approved!';
        title = 'Course Approved';
        bodyText = 'Congratulations! Your recently submitted course has been reviewed and approved by an admin.';
        bgColor = '#10b981'; // green
        break;
      case 'course_rejected':
        subject = 'Your Course has been Rejected';
        title = 'Course Rejected';
        bodyText = `Your recently submitted course has been rejected.<br><br><strong>Reason:</strong> ${rejectionReason || 'No reason provided.'}`;
        bgColor = '#ef4444'; // red
        break;
      case 'payout_approved':
        subject = 'Your Payout Request has been Approved!';
        title = 'Payout Approved';
        bodyText = 'Your payout request has been approved. The funds will be transferred to your account shortly.';
        bgColor = '#10b981'; // green
        break;
      case 'payout_rejected':
        subject = 'Your Payout Request has been Rejected';
        title = 'Payout Rejected';
        bodyText = `Your payout request has been rejected.<br><br><strong>Reason:</strong> ${rejectionReason || 'No reason provided.'}`;
        bgColor = '#ef4444'; // red
        break;
      case 'enroll_approved':
        subject = 'Your Enrollment Request has been Approved!';
        title = 'Enrollment Approved';
        bodyText = 'Your request to enroll in the course has been approved. You can now access the course materials.';
        bgColor = '#10b981'; // green
        break;
      case 'enroll_rejected':
        subject = 'Your Enrollment Request has been Rejected';
        title = 'Enrollment Rejected';
        bodyText = `Your request to enroll in the course has been rejected.<br><br><strong>Reason:</strong> ${rejectionReason || 'No reason provided.'}`;
        bgColor = '#ef4444'; // red
        break;
      default:
        subject = 'Test Email from Program';
        title = 'Test Email';
        bodyText = `This is a test email for the <strong>${content}</strong> template.`;
        break;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
      <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;">
        <div style="background:${bgColor};padding:24px 32px;">
          <h1 style="margin:0;font-size:1.4rem;color:#fff;">${title}</h1>
        </div>
        <div style="padding:32px;">
          <p>Hi there,</p>
          <p style="font-size: 16px; line-height: 1.5;">${bodyText}</p>
          <div style="background:#0f172a;border-radius:8px;padding:14px;margin-top:30px;font-size:13px;color:#94a3b8;">
            This is a test email dispatched from the Program System Config utility.
          </div>
        </div>
      </div>
    </body>
    </html>`;

    logger.info(`Sending test email to ${recipient} with content: ${content}`);
    
    await transporter.sendMail({
      from: `"Program Platform" <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject,
      html,
    });

    res.json({ message: 'Test email dispatched successfully', recipient, format, content, rejectionReason });
  } catch (err) {
    logger.error('Error sending test email', { error: err.message });
    res.status(500).json({ message: 'Failed to send test email. Please check server logs and SMTP configuration.' });
  }
};

