import crypto from 'crypto';
import nodemailer from 'nodemailer';

// ── Config (all env-configurable) ────────────────────────────────────────────
const OTP_SECRET          = process.env.OTP_SECRET || 'change_me_in_production';
const OTP_EXPIRY_MINUTES  = parseInt(process.env.OTP_EXPIRY_MINUTES  || '10', 10);
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const MAX_ATTEMPTS        = 5;

// ── OTP Generation ────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP using crypto.randomInt (CSPRNG, never Math.random).
 * Returns the raw code string.
 */
export function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000); // [0, 999999]
  return String(code).padStart(6, '0');
}

// ── HMAC Hashing ──────────────────────────────────────────────────────────────

/**
 * Return an HMAC-SHA256 hex digest of `code` using OTP_SECRET.
 * We never store the raw code — only this hash.
 */
export function hashOtp(code) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(String(code))
    .digest('hex');
}

/**
 * Timing-safe comparison of a candidate OTP against a stored hash.
 * Prevents timing-based oracle attacks.
 *
 * @param {string} candidateCode  - The OTP the user submitted (raw 6-digit string).
 * @param {string} storedHash     - The HMAC-SHA256 hex stored in DB.
 * @returns {boolean}
 */
export function verifyOtp(candidateCode, storedHash) {
  const candidateHash = hashOtp(candidateCode);
  // Both must be the same byte-length for timingSafeEqual to work.
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash,    'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Expiry / Cooldown helpers ─────────────────────────────────────────────────

/** Returns the Date when a freshly-created OTP expires. */
export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/** Returns the Date after which a new OTP can be requested for the same payout. */
export function resendCooldownEnd() {
  return new Date(Date.now() + RESEND_COOLDOWN_SEC * 1000);
}

export { MAX_ATTEMPTS, OTP_EXPIRY_MINUTES, RESEND_COOLDOWN_SEC };

// ── Gmail Transporter ─────────────────────────────────────────────────────────

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Email Sending ─────────────────────────────────────────────────────────────

/**
 * Send the payout OTP email.
 *
 * @param {object} opts
 * @param {string} opts.toEmail       - Recipient address (payoutEmail).
 * @param {string} opts.code          - The raw 6-digit OTP.
 * @param {number} opts.amount        - Payout amount in EGP (for fraud detection by the user).
 * @param {string} opts.instructorName
 * @param {boolean} opts.emailMismatch - True when payoutEmail differs from account email.
 */
export async function sendPayoutOtpEmail({ toEmail, code, amount, instructorName, emailMismatch }) {
  const expiryMins = OTP_EXPIRY_MINUTES;
  const formattedAmount = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const mismatchNotice = emailMismatch
    ? `<p style="color:#b45309;background:#fef3c7;padding:10px 14px;border-radius:6px;font-size:13px;">
         ⚠️ This OTP is being sent to a <strong>different email address</strong> than your registered account email.
         If you did not request this, please contact support immediately.
       </p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:24px 32px;">
      <h1 style="margin:0;font-size:1.4rem;color:#fff;">💸 Payout Verification Code</h1>
    </div>
    <div style="padding:32px;">
      <p>Hi <strong>${instructorName}</strong>,</p>
      <p>You've requested a payout of <strong style="color:#f97316;">EGP ${formattedAmount}</strong>. Use the code below to confirm this request:</p>

      <div style="text-align:center;margin:28px 0;">
        <span style="font-size:2.6rem;font-weight:800;letter-spacing:10px;color:#fbbf24;background:#0f172a;padding:16px 28px;border-radius:12px;display:inline-block;">
          ${code}
        </span>
      </div>

      <p style="font-size:13px;color:#94a3b8;">This code expires in <strong>${expiryMins} minutes</strong>.</p>

      ${mismatchNotice}

      <div style="background:#0f172a;border-radius:8px;padding:14px;margin-top:20px;font-size:13px;color:#94a3b8;">
        🔒 <strong>Never share this code</strong> with anyone. Our team will never ask for it. 
        If you did not initiate this payout, ignore this email and contact support.
      </div>
    </div>
    <div style="padding:16px 32px;font-size:11px;color:#475569;border-top:1px solid #334155;">
      Program Platform · This is an automated security message.
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"Program Platform" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Your Payout Verification Code: ${code}`,
    text: `Hi ${instructorName},\n\nYour payout verification code is: ${code}\n\nAmount: EGP ${formattedAmount}\nExpires in: ${expiryMins} minutes\n\nDo NOT share this code with anyone.`,
    html,
  });
}

/**
 * Send an email notifying the instructor of payout approval or rejection.
 *
 * @param {object} opts
 * @param {string} opts.toEmail       - Recipient address.
 * @param {string} opts.instructorName
 * @param {string} opts.status        - 'approved' or 'rejected'
 * @param {string} [opts.reason]      - Reason for rejection (if applicable)
 */
export async function sendPayoutStatusEmail({ toEmail, instructorName, status, reason }) {
  const isApproved = status === 'approved';
  const subject = isApproved 
    ? '✅ Your Payout Request has been Approved!' 
    : '❌ Your Payout Request has been Rejected';
    
  const bodyText = isApproved
    ? `your request payout approved check your balance now`
    : `your request payout due to ${reason || 'unspecified reasons'}`;
    
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg, ${isApproved ? '#10b981,#34d399' : '#ef4444,#f87171'});padding:24px 32px;">
      <h1 style="margin:0;font-size:1.4rem;color:#fff;">${subject}</h1>
    </div>
    <div style="padding:32px;">
      <p>Hi <strong>${instructorName}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.5;">${isApproved ? 'Your payout request has been <strong>approved</strong>. Please check your bank account or wallet balance now. Processing times may vary depending on your bank.' : `Your payout request has been <strong>rejected</strong> due to: <br/><br/><strong style="color: #ef4444; background: #0f172a; padding: 12px; display: block; border-radius: 8px;">${reason || 'unspecified reasons'}</strong>`}</p>
      
      <div style="background:#0f172a;border-radius:8px;padding:14px;margin-top:30px;font-size:13px;color:#94a3b8;">
        If you have any questions, please contact our support team.
      </div>
    </div>
    <div style="padding:16px 32px;font-size:11px;color:#475569;border-top:1px solid #334155;">
      Program Platform · Automated update message.
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"Program Platform" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    text: `Hi ${instructorName},\n\n${bodyText}`,
    html,
  });
}

/**
 * Send an email to admins notifying them of a new payout request.
 *
 * @param {object} opts
 * @param {string[]} opts.adminEmails     - Array of admin email addresses.
 * @param {string} opts.instructorName   - Instructor name.
 * @param {string} opts.instructorEmail  - Instructor email.
 * @param {number} opts.amount           - Gross requested amount.
 * @param {number} opts.expectedPayout   - Net payout amount.
 * @param {string} opts.method           - Payout method name.
 * @param {string} opts.details          - Account/phone number details.
 * @param {string} opts.referenceId      - Invoice ID / reference ID.
 */
export async function sendAdminPayoutAlertEmail({
  adminEmails,
  instructorName,
  instructorEmail,
  amount,
  expectedPayout,
  method,
  details,
  referenceId,
}) {
  if (!adminEmails || adminEmails.length === 0) return;

  const formattedGross = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedNet = Number(expectedPayout || amount * 0.98).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedMethod = (method || '').replace('_', ' ').toUpperCase();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f97316,#e11d48);padding:24px 32px;">
      <h1 style="margin:0;font-size:1.4rem;color:#fff;">🔔 New Payout Request Initiated</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;margin-top:0;">A new payout request has been verified and requires admin attention.</p>
      
      <div style="background:#0f172a;border-radius:12px;padding:20px;margin:24px 0;line-height:1.8;font-size:14px;">
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Instructor Name:</span> <strong style="color:#fff;">${instructorName}</strong>
        </div>
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Instructor Email:</span> <strong style="color:#fff;">${instructorEmail}</strong>
        </div>
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Payout Method:</span> <strong style="color:#fbbf24;">${formattedMethod}</strong>
        </div>
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Phone / Details Provided:</span> <strong style="color:#fff;">${details || 'N/A'}</strong>
        </div>
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Invoice ID:</span> <strong style="color:#fff;">${referenceId || 'N/A'}</strong>
        </div>
        <div style="border-bottom:1px solid #334155;padding-bottom:8px;margin-bottom:8px;">
          <span style="color:#94a3b8;">Gross Requested:</span> <strong style="color:#fff;">EGP ${formattedGross}</strong>
        </div>
        <div>
          <span style="color:#94a3b8;">Net Payout Amount:</span> <strong style="color:#10b981;font-size:1.1rem;">EGP ${formattedNet}</strong>
        </div>
      </div>

      <p style="font-size:13px;color:#94a3b8;margin-bottom:0;">
        Please log into the Admin Portal to review and approve or reject this payout.
      </p>
    </div>
    <div style="padding:16px 32px;font-size:11px;color:#475569;border-top:1px solid #334155;">
      Program Platform · Automated Admin Notification System
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"Program Platform" <${process.env.GMAIL_USER}>`,
    to: adminEmails.join(','),
    subject: `🔔 Payout Request: EGP ${formattedNet} (${instructorName})`,
    text: `New Payout Request:\nInstructor: ${instructorName} (${instructorEmail})\nMethod: ${formattedMethod}\nDetails: ${details}\nInvoice ID: ${referenceId}\nNet Payout: EGP ${formattedNet}`,
    html,
  });
}
