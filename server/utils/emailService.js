import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import logger from './logger.js';
import { getInternalConfig } from './configFetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '../templates/emails');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const cache = {};

const notificationSettingForTemplate = {
  'admin-new-request': 'adminAlerts',
  'instructor-course-approved': 'instructorEmails',
  'instructor-course-rejected': 'instructorEmails',
  'instructor-payout-approved': 'instructorEmails',
  'instructor-payout-rejected': 'instructorEmails',
  'student-enroll-approved': 'studentEmails',
  'student-enroll-rejected': 'studentEmails',
};

export const getEmailDeliveryStatus = async () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      configured: false,
      connected: false,
      message: 'SMTP credentials are not configured on the server.',
    };
  }

  try {
    await transporter.verify();
    return { configured: true, connected: true, message: 'SMTP connection verified.' };
  } catch (error) {
    logger.warn('SMTP connection check failed', { error: error.message });
    return { configured: true, connected: false, message: 'SMTP connection could not be verified.' };
  }
};

/**
 * Helper to compile and cache handlebars templates
 */
const getTemplate = (templateName) => {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  const stats = fs.statSync(templatePath);
  
  if (cache[templateName] && cache[templateName].mtime === stats.mtimeMs) {
    return cache[templateName].compiled;
  }
  
  const source = fs.readFileSync(templatePath, 'utf-8');
  const compiled = handlebars.compile(source);
  cache[templateName] = {
    compiled,
    mtime: stats.mtimeMs
  };
  return compiled;
};

/**
 * Helper to send email safely (silently fails if SMTP not configured, matching existing behavior)
 */
const sendMailSafe = async (options) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    logger.warn('Email not sent — GMAIL_USER/GMAIL_APP_PASSWORD not configured', { template: options.templateName, to: options.to });
    return;
  }

  const notificationSetting = notificationSettingForTemplate[options.templateName];
  if (notificationSetting) {
    const config = await getInternalConfig();
    if (config.notifications?.[notificationSetting] === false) {
      logger.info('Email skipped by notification preference', {
        template: options.templateName,
        notificationSetting,
      });
      return;
    }
  }
  
  try {
    await transporter.sendMail({
      from: `"Program Platform" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to: options.to, template: options.templateName });
  }
};

/**
 * 1. instructor-course-approved.html
 * Fields: instructor_name, course_title, course_category, approval_date, dashboard_url, help_url, settings_url
 */
export const sendCourseApprovedEmail = async ({ toEmail, ...context }) => {
  const template = getTemplate('instructor-course-approved');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'instructor-course-approved',
    to: toEmail,
    subject: 'Your Course has been Approved!',
    html
  });
};

/**
 * 2. instructor-course-rejected.html
 * Fields: instructor_name, course_title, rejection_reason, review_date, edit_course_url, help_url, settings_url
 */
export const sendCourseRejectedEmail = async ({ toEmail, ...context }) => {
  if (!context.rejection_reason) {
    throw new Error('rejection_reason is required for instructor-course-rejected email');
  }
  
  const template = getTemplate('instructor-course-rejected');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'instructor-course-rejected',
    to: toEmail,
    subject: 'Your Course has been Rejected',
    html
  });
};

/**
 * 3. instructor-payout-approved.html
 * Fields: instructor_name, payout_amount, payout_method, payout_reference, approval_date, arrival_estimate, earnings_url, help_url, settings_url
 */
export const sendPayoutApprovedEmail = async ({ toEmail, ...context }) => {
  const template = getTemplate('instructor-payout-approved');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'instructor-payout-approved',
    to: toEmail,
    subject: 'Your Payout Request has been Approved!',
    html
  });
};

/**
 * 4. instructor-payout-rejected.html
 * Fields: instructor_name, payout_amount, rejection_reason, payout_reference, review_date, payout_settings_url, help_url, settings_url
 */
export const sendPayoutRejectedEmail = async ({ toEmail, ...context }) => {
  if (!context.rejection_reason) {
    throw new Error('rejection_reason is required for instructor-payout-rejected email');
  }
  
  const template = getTemplate('instructor-payout-rejected');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'instructor-payout-rejected',
    to: toEmail,
    subject: 'Your Payout Request has been Rejected',
    html
  });
};

/**
 * 5. admin-new-request.html
 * Fields: request_id, request_type_label, request_type_tag, submitted_date, item_title, requester_name, requester_role, admin_name, review_url, queue_url, settings_url
 */
export const sendAdminNewRequestEmail = async ({ adminEmails, ...context }) => {
  const template = getTemplate('admin-new-request');
  // Need to send to each admin individually so `admin_name` can be customized if needed, 
  // or we just send one email if admin_name is generic. Let's send individually if we have an array of emails/names.
  // Actually, we'll just loop and send to each email.
  
  for (const admin of adminEmails) {
    // If admin is an object with email and name, otherwise just string email
    const toEmail = admin.email || admin;
    const adminName = admin.name || 'Admin';
    
    const html = template({ ...context, admin_name: adminName });
    await sendMailSafe({
      templateName: 'admin-new-request',
      to: toEmail,
      subject: `Action Required: ${context.request_type_label}`,
      html
    });
  }
};

/**
 * 6. student-enroll-approved.html
 * Fields: student_name, course_title, instructor_name, enrollment_date, course_url, help_url, settings_url
 */
export const sendStudentEnrollApprovedEmail = async ({ toEmail, ...context }) => {
  const template = getTemplate('student-enroll-approved');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'student-enroll-approved',
    to: toEmail,
    subject: 'Your Enrollment has been Approved!',
    html
  });
};

/**
 * 7. student-enroll-rejected.html
 * Fields: student_name, course_title, rejection_reason, review_date, browse_courses_url, help_url, settings_url
 */
export const sendStudentEnrollRejectedEmail = async ({ toEmail, ...context }) => {
  if (!context.rejection_reason) {
    throw new Error('rejection_reason is required for student-enroll-rejected email');
  }
  
  const template = getTemplate('student-enroll-rejected');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'student-enroll-rejected',
    to: toEmail,
    subject: 'Your Enrollment has been Rejected',
    html
  });
};

/**
 * 8. otp-verification.html
 * Fields: account_email, otp_code, expiry_minutes
 */
export const sendOtpVerificationEmail = async ({ toEmail, ...context }) => {
  const template = getTemplate('otp-verification');
  const html = template(context);
  
  await sendMailSafe({
    templateName: 'otp-verification',
    to: toEmail,
    subject: 'Your Verification Code',
    html
  });
};
