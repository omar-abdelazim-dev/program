import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // ── Existing fields (preserved for backward compatibility) ───────────────
    action: { type: String, required: true },
    // changedBy = the actor who performed the action (null for anonymous events)
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    module: { type: String, required: true },

    // ── Extended fields added in Sprint 1 ────────────────────────────────────
    // The resource that was acted upon (e.g. the user who was blocked)
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Mongoose model name of the target resource (e.g. 'User', 'Course')
    targetModel: { type: String, default: null },
    // Network context — for correlating events to a specific session
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    // Severity level for filtering/alerting: 'info' | 'warn' | 'error'
    severity: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info',
    },
    // Arbitrary extra context (role, reason, etc.) — kept as Mixed for flexibility
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    // Audit logs are append-only by design. Disabling versionKey prevents
    // accidental __v increments that could interfere with export pipelines.
    versionKey: false,
  }
);

// Compound index for common security queries: "all auth failures in last 24h"
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, severity: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
