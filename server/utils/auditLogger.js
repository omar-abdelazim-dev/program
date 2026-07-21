'use strict';

/**
 * @file utils/auditLogger.js
 * Writes tamper-evident audit trail records to MongoDB (AuditLog model).
 * Falls back to the security logger if the DB write fails.
 *
 * Tracked events: user deletion, course deletion, payment actions,
 * role changes, instructor approvals.
 */

const { securityLogger } = require('./logger');

// Lazy-load AuditLog to avoid circular deps at boot time.
let AuditLog;
const getModel = () => {
  if (!AuditLog) AuditLog = require('../models/AuditLog');
  return AuditLog;
};

/**
 * Write an audit record.
 *
 * @param {object} opts
 * @param {string} opts.action       - Machine-readable action name (e.g. USER_DELETED)
 * @param {string} opts.performedBy  - Mongoose ObjectId string of the actor
 * @param {string} [opts.targetId]   - Mongoose ObjectId string of the affected resource
 * @param {string} [opts.targetModel]- Model name (e.g. 'User', 'Course')
 * @param {object} [opts.metadata]   - Any additional context
 * @param {string} [opts.ip]         - Request IP address
 */
const auditLog = async ({ action, performedBy, targetId, targetModel, metadata = {}, ip }) => {
  try {
    const Model = getModel();
    await Model.create({ action, performedBy, targetId, targetModel, metadata, ip });
  } catch (err) {
    // Never let audit logging crash the main request flow.
    securityLogger.error('AUDIT_LOG_WRITE_FAILED', { action, performedBy, error: err.message });
  }
};

// ── Named helpers ──────────────────────────────────────────────────────────

auditLog.userDeleted      = (performedBy, targetId, ip, metadata) =>
  auditLog({ action: 'USER_DELETED', performedBy, targetId, targetModel: 'User', ip, metadata });

auditLog.courseDeleted    = (performedBy, targetId, ip, metadata) =>
  auditLog({ action: 'COURSE_DELETED', performedBy, targetId, targetModel: 'Course', ip, metadata });

auditLog.paymentAction    = (performedBy, targetId, ip, metadata) =>
  auditLog({ action: 'PAYMENT_ACTION', performedBy, targetId, targetModel: 'Payment', ip, metadata });

auditLog.roleChanged      = (performedBy, targetId, ip, metadata) =>
  auditLog({ action: 'ROLE_CHANGED', performedBy, targetId, targetModel: 'User', ip, metadata });

auditLog.instructorApproved = (performedBy, targetId, ip, metadata) =>
  auditLog({ action: 'INSTRUCTOR_APPROVED', performedBy, targetId, targetModel: 'User', ip, metadata });

module.exports = auditLog;
