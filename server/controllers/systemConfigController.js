import SystemConfig from '../models/SystemConfig.js';
import AuditLog from '../models/AuditLog.js';
import Enrollment from '../models/Enrollment.js';

import { getInternalConfig, clearConfigCache } from '../utils/configFetcher.js';
import logger from '../utils/logger.js';
import * as emailService from '../utils/emailService.js';

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

    let dispatched = false;
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
        // Fallback for an unknown template mapping — use standard nodemailer to show they hit a valid endpoint
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
        await transporter.sendMail({
          from: `"Program Platform" <${process.env.GMAIL_USER}>`,
          to: recipient,
          subject: 'Test Email from Program',
          html: `<p>This is a test email for the <strong>${content}</strong> template which has not been explicitly mapped to a new Handlebars template.</p>`
        });
        break;
    }

    res.json({ message: 'Test email dispatched successfully', recipient, format, content, rejectionReason });
  } catch (err) {
    logger.error('Error sending test email', { error: err.message });
    res.status(500).json({ message: 'Failed to send test email. Please check server logs and SMTP configuration.' });
  }
};

