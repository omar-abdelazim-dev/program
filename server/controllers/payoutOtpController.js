import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import PayoutOTP from '../models/PayoutOTP.js';
import PayoutAuditLog from '../models/PayoutAuditLog.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  resendCooldownEnd,
  sendPayoutOtpEmail,
  sendAdminPayoutAlertEmail,
  MAX_ATTEMPTS,
} from '../utils/payoutOtp.js';

const APPROVAL_THRESHOLD = parseFloat(process.env.PAYOUT_APPROVAL_THRESHOLD || '5000');

// ── Helper: write audit log ───────────────────────────────────────────────────
async function audit(payoutRequestId, action, actorId, ipAddress, metadata = {}, session = null) {
  try {
    await PayoutAuditLog.create(
      [{ payoutRequestId, action, actorId, ipAddress, metadata }],
      session ? { session } : {}
    );
  } catch (err) {
    logger.error('Failed to write payout audit log', { err: err.message, action });
  }
}

// ── POST /api/payouts/:id/request-otp ─────────────────────────────────────────
// Generate a new OTP and email it to the instructor's chosen payoutEmail.
// Enforces a 60-second resend cooldown.
export const requestOtp = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    // Only the owning instructor may request an OTP
    if (tx.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!['pending', 'otp_verified'].includes(tx.status) && tx.status !== 'pending') {
      return res.status(400).json({ message: `Cannot send OTP for a payout in status '${tx.status}'` });
    }

    const payoutEmail = req.body.payoutEmail || req.user.email;

    // Validate email format (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payoutEmail)) {
      return res.status(400).json({ message: 'Invalid email address format' });
    }

    // Check resend cooldown — if an OTP already exists and cooldown hasn't passed
    const existing = await PayoutOTP.findOne({ payoutRequestId: tx._id });
    if (existing && existing.resendAvailableAt > new Date()) {
      const secsLeft = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
      return res.status(429).json({
        message: `Please wait ${secsLeft} seconds before requesting a new code.`,
        resendAvailableAt: existing.resendAvailableAt,
      });
    }

    // Generate fresh OTP
    const code    = generateOtp();
    const hash    = hashOtp(code);
    const expires = otpExpiresAt();
    const resendAt = resendCooldownEnd();

    // Detect email mismatch (fraud signal)
    const emailMismatch = payoutEmail.toLowerCase().trim() !== req.user.email.toLowerCase().trim();
    if (emailMismatch) {
      logger.warn('Payout OTP email mismatch', {
        userId: req.user.id,
        accountEmail: req.user.email,
        payoutEmail,
        txId: tx._id,
      });
      await audit(tx._id, 'email_mismatch_flagged', req.user.id, req.ip, {
        accountEmail: req.user.email,
        payoutEmail,
      });
    }

    // Send email FIRST so if email transport fails, DB cooldown is not set prematurely
    await sendPayoutOtpEmail({
      toEmail: payoutEmail,
      code,
      amount: Math.abs(tx.amount),
      instructorName: req.user.name || 'Instructor',
      emailMismatch,
    });

    // Upsert: replace any existing OTP for this payout AFTER email successfully sent
    await PayoutOTP.findOneAndUpdate(
      { payoutRequestId: tx._id },
      {
        payoutRequestId: tx._id,
        email: payoutEmail.toLowerCase().trim(),
        otpHash: hash,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        expiresAt: expires,
        resendAvailableAt: resendAt,
        usedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const action = existing ? 'otp_resent' : 'otp_requested';
    await audit(tx._id, action, req.user.id, req.ip, { payoutEmail, emailMismatch });

    return res.json({
      message: `Verification code sent to ${payoutEmail}`,
      resendAvailableAt: resendAt,
      expiresAt: expires,
      emailMismatch,
    });
  } catch (err) {
    logger.error('requestOtp error', { err: err.message, stack: err.stack });
    return res.status(500).json({ message: err.message || 'Failed to send verification code' });
  }
};

// ── POST /api/payouts/:id/verify-otp ─────────────────────────────────────────
// Verify the OTP and advance status: pending → otp_verified (above threshold)
// or pending → approved (below threshold).
// Wrapped in a MongoDB session for atomicity.
export const verifyPayoutOtp = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const { code } = req.body;
      if (!code || !/^\d{6}$/.test(String(code))) {
        throw Object.assign(new Error('A 6-digit numeric code is required'), { status: 400 });
      }

      const tx = await Transaction.findById(req.params.id).session(session);
      if (!tx || tx.type !== 'payout_request') {
        throw Object.assign(new Error('Payout request not found'), { status: 404 });
      }

      if (tx.instructor.toString() !== req.user.id.toString()) {
        throw Object.assign(new Error('Not authorized'), { status: 403 });
      }

      if (tx.status !== 'pending') {
        throw Object.assign(new Error(`Payout is already in status '${tx.status}'`), { status: 400 });
      }

      // Fetch OTP record WITH the hash (normally select:false)
      const otpRecord = await PayoutOTP.findOne({ payoutRequestId: tx._id })
        .select('+otpHash')
        .session(session);

      if (!otpRecord) {
        throw Object.assign(new Error('No OTP found. Please request a verification code first.'), { status: 400 });
      }

      if (otpRecord.usedAt) {
        throw Object.assign(new Error('This code has already been used.'), { status: 400 });
      }

      if (otpRecord.expiresAt < new Date()) {
        throw Object.assign(new Error('Verification code has expired. Please request a new one.'), { status: 400 });
      }

      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await audit(tx._id, 'otp_max_attempts_exceeded', req.user.id, req.ip, {}, session);
        throw Object.assign(
          new Error('Maximum verification attempts exceeded. Please request a new code.'),
          { status: 429 }
        );
      }

      // Increment attempt count first (even before checking, to prevent oracle timing abuse)
      otpRecord.attempts += 1;
      await otpRecord.save({ session });

      if (!verifyOtp(String(code), otpRecord.otpHash)) {
        const remaining = otpRecord.maxAttempts - otpRecord.attempts;
        await audit(tx._id, 'otp_failed_attempt', req.user.id, req.ip, {
          attempt: otpRecord.attempts,
          remaining,
        }, session);
        throw Object.assign(
          new Error(`Invalid code. ${remaining} attempt(s) remaining.`),
          { status: 400, remaining }
        );
      }

      // Mark OTP as used
      otpRecord.usedAt = new Date();
      await otpRecord.save({ session });

      // Determine next status
      const amount = Math.abs(tx.amount);
      const requiresApproval = amount >= APPROVAL_THRESHOLD;
      const nextStatus = requiresApproval ? 'otp_verified' : 'approved';

      tx.status = nextStatus;
      tx.otpVerifiedAt = new Date();
      await tx.save({ session });

      await Notification.create([{
        user: req.user.id,
        title: 'Payout Request Received',
        message: 'We have received your payout request and it is now under review.',
        type: 'system',
        refId: tx._id,
      }], { session });

      // Notify all admins about the new payout request
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).session(session);
      const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const adminNotifications = admins.map(admin => ({
        user: admin._id,
        title: 'New Payout Request',
        message: `Instructor ${req.user.name || 'An instructor'} has submitted a payout request of EGP ${formattedAmount}.`,
        type: 'system',
        link: '/admin',
        refId: tx._id,
      }));
      if (adminNotifications.length > 0) {
        await Notification.insertMany(adminNotifications, { session });
      }

      await audit(tx._id, 'otp_verified', req.user.id, req.ip, {
        nextStatus,
        requiresApproval,
        amount,
      }, session);

      result = { status: nextStatus, requiresApproval, tx };
    });

    // Send email notification to all admins asynchronously
    try {
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('email');
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        await sendAdminPayoutAlertEmail({
          adminEmails,
          instructorName: req.user.name || 'Instructor',
          instructorEmail: req.user.email,
          amount: Math.abs(result.tx.amount),
          expectedPayout: result.tx.expectedPayout,
          method: result.tx.payoutMethod,
          details: result.tx.payoutDetails,
          referenceId: result.tx.referenceId,
        });
      }
    } catch (adminEmailErr) {
      logger.error('Failed to send admin payout alert email', { err: adminEmailErr.message });
    }

    return res.json({
      message: result.requiresApproval
        ? 'OTP verified. This payout requires a second approver before execution.'
        : 'OTP verified. Payout approved and ready for execution.',
      status: result.status,
      requiresApproval: result.requiresApproval,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message, remaining: err.remaining });
    }
    logger.error('verifyPayoutOtp error', { err: err.message });
    return res.status(500).json({ message: 'Verification failed' });
  } finally {
    await session.endSession();
  }
};

// ── POST /api/payouts/:id/approve ─────────────────────────────────────────────
// Second-approver sign-off (finance_approver role or admin).
// Blocks self-approval. Only acts on status === 'otp_verified'.
export const approvePayout = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let tx;
    await session.withTransaction(async () => {
      tx = await Transaction.findById(req.params.id).session(session);
      if (!tx || tx.type !== 'payout_request') {
        throw Object.assign(new Error('Payout request not found'), { status: 404 });
      }

      // Block self-approval
      if (tx.instructor.toString() === req.user.id.toString()) {
        throw Object.assign(
          new Error('Self-approval is not permitted. A different user must approve this payout.'),
          { status: 403 }
        );
      }

      if (tx.status !== 'otp_verified') {
        throw Object.assign(
          new Error(`Cannot approve a payout in status '${tx.status}'. It must be in 'otp_verified' status.`),
          { status: 400 }
        );
      }

      tx.status = 'approved';
      tx.approvedBy = req.user.id;
      tx.approvedAt = new Date();
      await tx.save({ session });

      await audit(tx._id, 'payout_approved', req.user.id, req.ip, {
        approvedBy: req.user.id,
        amount: Math.abs(tx.amount),
      }, session);
    });

    return res.json({
      message: 'Payout approved. It is now ready for execution.',
      status: tx.status,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    logger.error('approvePayout error', { err: err.message });
    return res.status(500).json({ message: 'Approval failed' });
  } finally {
    await session.endSession();
  }
};

// ── POST /api/payouts/:id/execute ─────────────────────────────────────────────
// Idempotent execution — atomically claim approved → processing BEFORE calling
// the external provider. The provider call is NOT inside a DB transaction.
export const executePayout = async (req, res) => {
  let tx;
  try {
    // Atomically claim: only one concurrent call can flip approved → processing
    tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, type: 'payout_request', status: 'approved' },
      {
        $set: {
          status: 'processing',
          executionAttemptedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!tx) {
      // Either not found, not approved, or already claimed by a concurrent call
      const existing = await Transaction.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Payout not found' });
      return res.status(409).json({
        message: `Payout cannot be executed in its current status: '${existing.status}'`,
        status: existing.status,
      });
    }

    await audit(tx._id, 'payout_executed', req.user.id, req.ip, {
      amount: Math.abs(tx.amount),
      method: tx.payoutMethod,
    });

    // ── External payment provider call ────────────────────────────────────────
    // Replace with your real provider SDK/API.
    // IMPORTANT: pass idempotencyKey to prevent double-processing on retries.
    let providerResult;
    try {
      providerResult = await callExternalPaymentProvider({
        idempotencyKey: tx.referenceId,
        amount: tx.expectedPayout || Math.abs(tx.amount) * 0.98,
        method: tx.payoutMethod,
        destination: tx.payoutDetails,
      });
    } catch (providerErr) {
      // Classify the error
      const isAmbiguous = isAmbiguousProviderError(providerErr);

      if (isAmbiguous) {
        // Reset to approved — a human/reconciliation job must resolve this
        // to avoid risking a double payout on auto-retry.
        await Transaction.findByIdAndUpdate(tx._id, {
          $set: {
            status: 'approved',
            failureReason: `Ambiguous provider error: ${providerErr.message}`,
          },
        });
        await audit(tx._id, 'payout_failed', req.user.id, req.ip, {
          ambiguous: true,
          reason: providerErr.message,
        });
        return res.status(502).json({
          message: 'Payout status is ambiguous. Our team will reconcile it manually.',
          status: 'approved', // reset
        });
      }

      // Definite failure
      await Transaction.findByIdAndUpdate(tx._id, {
        $set: {
          status: 'failed',
          failureReason: providerErr.message,
        },
      });
      await audit(tx._id, 'payout_failed', req.user.id, req.ip, {
        ambiguous: false,
        reason: providerErr.message,
      });
      return res.status(502).json({ message: `Payout failed: ${providerErr.message}`, status: 'failed' });
    }

    // Success
    await Transaction.findByIdAndUpdate(tx._id, {
      $set: {
        status: 'paid',
        providerTransactionId: providerResult.transactionId,
        payoutDetails: '', // Erase sensitive data after success
      },
    });
    await audit(tx._id, 'payout_completed', req.user.id, req.ip, {
      providerTransactionId: providerResult.transactionId,
    });

    return res.json({
      message: 'Payout executed successfully.',
      status: 'paid',
      providerTransactionId: providerResult.transactionId,
    });
  } catch (err) {
    logger.error('executePayout error', { err: err.message });
    return res.status(500).json({ message: 'Execution error' });
  }
};

// ── GET /api/payouts/:id ──────────────────────────────────────────────────────
export const getPayoutStatus = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout not found' });
    }

    const isOwner    = tx.instructor.toString() === req.user.id.toString();
    const isOpsAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isOpsAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    return res.json({ payout: tx });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching payout status' });
  }
};

// ── Stub: replace with your real payment provider ────────────────────────────
async function callExternalPaymentProvider({ idempotencyKey, amount, method, destination }) {
  // TODO: Integrate with Paymob / Fawry / Instapay API etc.
  // Must accept and forward idempotencyKey to the provider.
  // Throw on failure; throw with err.ambiguous = true for timeouts.
  logger.info('Payment provider call (stub)', { idempotencyKey, amount, method });
  // Simulated success — delete this stub before production use
  return { transactionId: `STUB-${Date.now()}` };
}

function isAmbiguousProviderError(err) {
  // Treat timeouts / network errors as ambiguous
  return err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.ambiguous === true;
}
