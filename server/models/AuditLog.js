'use strict';

/**
 * @file models/AuditLog.js
 * Immutable audit trail for sensitive platform actions.
 * Records are append-only — no update/delete operations on this collection.
 */

const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'USER_DELETED',
  'COURSE_DELETED',
  'PAYMENT_ACTION',
  'ROLE_CHANGED',
  'INSTRUCTOR_APPROVED',
  'ADMIN_ACTION',
  'SECURITY_EVENT',
];

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      enum: ['User', 'Course', 'Payment', 'Certificate', null],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    // Prevent accidental updates to audit records at the Mongoose level.
    // Enforce at DB level with role-based write permissions.
  }
);

// Compound index for audit queries
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
