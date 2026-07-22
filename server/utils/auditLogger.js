/**
 * Audit logger utility.
 *
 * Writes structured audit entries to the AuditLog collection AND
 * to the security Winston log. Both destinations are written in a
 * fire-and-forget manner — an audit write failure NEVER causes the
 * original request to fail.
 *
 * Usage:
 *   await logAudit({
 *     action:      'LOGIN_SUCCESS',
 *     module:      'auth',
 *     userId:      req.user.id,         // actor
 *     targetId:    user._id,            // subject (optional)
 *     targetModel: 'User',
 *     ipAddress:   req.ip,
 *     userAgent:   req.get('user-agent'),
 *     severity:    'info',
 *     metadata:    { role: user.role },
 *   });
 */

import AuditLog from '../models/AuditLog.js';
import { securityLogger } from './logger.js';

/**
 * @param {object} opts
 * @param {string} opts.action         - Machine-readable action name (e.g. 'LOGIN_FAILURE')
 * @param {string} opts.module         - Domain area (e.g. 'auth', 'admin', 'upload')
 * @param {*}      [opts.userId]       - ObjectId of the actor (req.user.id)
 * @param {*}      [opts.targetId]     - ObjectId of the affected resource
 * @param {string} [opts.targetModel]  - Mongoose model name of the target
 * @param {*}      [opts.oldValue]     - Previous value (for change audits)
 * @param {*}      [opts.newValue]     - New value (for change audits)
 * @param {string} [opts.ipAddress]    - Requester IP
 * @param {string} [opts.userAgent]    - Requester User-Agent header
 * @param {string} [opts.severity]     - 'info' | 'warn' | 'error' (default 'info')
 * @param {object} [opts.metadata]     - Any additional context
 */
export const logAudit = async ({
  action,
  module,
  userId = null,
  targetId = null,
  targetModel = null,
  oldValue = undefined,
  newValue = undefined,
  ipAddress = null,
  userAgent = null,
  severity = 'info',
  metadata = {},
}) => {
  try {
    // 1. Write to MongoDB AuditLog collection
    await AuditLog.create({
      action,
      module,
      changedBy: userId,
      targetId,
      targetModel,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      severity,
      metadata,
    });

    // 2. Also write to security.log (Winston)
    securityLogger[severity] || securityLogger.info;
    const logFn = (securityLogger[severity] || securityLogger.info).bind(securityLogger);
    logFn(action, {
      module,
      userId: userId?.toString?.() || userId,
      targetId: targetId?.toString?.() || targetId,
      targetModel,
      ipAddress,
      severity,
      ...metadata,
    });
  } catch (err) {
    // Never throw — a logging failure must not break the request
    try {
      securityLogger.error('Audit log write failed', { action, module, error: err.message });
    } catch {
      // last resort: silent
    }
  }
};
