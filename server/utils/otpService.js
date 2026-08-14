import crypto from 'crypto';
import nodemailer from 'nodemailer';
import EmailOTP from '../models/EmailOTP.js';
import logger from './logger.js';

const OTP_SECRET = process.env.OTP_SECRET || 'change_me_in_production';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function generateOtp() {
  const code = crypto.randomInt(0, 1_000_000);
  return String(code).padStart(6, '0');
}

function hashOtp(code) {
  return crypto.createHmac('sha256', OTP_SECRET).update(String(code)).digest('hex');
}

export function verifyOtpHash(candidateCode, storedHash) {
  const candidateHash = hashOtp(candidateCode);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function requestOTP({ userId, email, purpose, metadata = {}, displayName = 'User' }) {
  const query = userId ? { userId, purpose } : { email, purpose };

  // Check cooldown
  const existingOtp = await EmailOTP.findOne(query);
  if (existingOtp) {
    const elapsed = (Date.now() - existingOtp.updatedAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SEC) {
      const waitTime = Math.ceil(RESEND_COOLDOWN_SEC - elapsed);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new code.`);
    }
  }

  const rawOtp = generateOtp();
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[DEV OTP DEBUG] 🔑 Purpose: ${purpose} | Email: ${email} | Code: ${rawOtp}\n`);
  }
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await EmailOTP.findOneAndUpdate(
    query,
    {
      email,
      otpHash: hashedOtp,
      attempts: 0,
      expiresAt,
      usedAt: null,
      metadata,
    },
    { upsert: true, new: true }
  );

  let subject = 'Your Verification Code';
  let title = 'Verification Code';
  let textContext = 'Use the code below to verify your request:';

  if (purpose === 'password_reset') {
    subject = 'Password Reset Code';
    title = 'Reset Your Password';
    textContext = 'You requested a password reset. Use the code below to set your new password:';
  } else if (purpose === 'register_verification') {
    subject = 'Verify Your Email Address';
    title = 'Welcome!';
    textContext = 'Thank you for registering. Please verify your email address using the code below:';
  } else if (purpose === 'password_change') {
    subject = 'Password Change Request';
    title = 'Change Your Password';
    textContext = 'You requested to change your password. Use the code below to confirm this change:';
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:480px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:24px 32px;">
      <h1 style="margin:0;font-size:1.4rem;color:#fff;">🛡️ ${title}</h1>
    </div>
    <div style="padding:32px;">
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>${textContext}</p>
      <div style="text-align:center;margin:28px 0;">
        <span style="font-size:2.6rem;font-weight:800;letter-spacing:10px;color:#3b82f6;background:#0f172a;padding:16px 28px;border-radius:12px;display:inline-block;">
          ${rawOtp}
        </span>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;">
        This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: `"Program Support" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
  } catch (err) {
    logger.error('Failed to send OTP email', { error: err.message, email });
    throw new Error('Could not send verification email. Please try again later.');
  }

  return { expiresAt };
}

export async function verifyOTP({ userId, email, purpose, otp }) {
  const query = userId ? { userId, purpose } : { email, purpose };
  const record = await EmailOTP.findOne(query);
  if (!record) throw new Error('No active code found. Please request a new one.');
  if (record.usedAt) throw new Error('This code has already been used.');
  if (Date.now() > record.expiresAt.getTime()) throw new Error('This code has expired.');
  if (record.attempts >= record.maxAttempts) throw new Error('Too many failed attempts. Please request a new code.');

  const isValid = verifyOtpHash(otp, record.otpHash);
  
  if (!isValid) {
    record.attempts += 1;
    await record.save();
    throw new Error('Invalid code.');
  }

  record.usedAt = new Date();
  await record.save();

  return record.metadata;
}
