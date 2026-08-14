import crypto from 'crypto';
import nodemailer from 'nodemailer';
import EmailOTP from '../models/EmailOTP.js';
import logger from './logger.js';

const OTP_SECRET = process.env.OTP_SECRET || 'change_me_in_production';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
// How long a *verified* record survives before the TTL index reaps it —
// separate from OTP_EXPIRY_MINUTES, which governs how long the code itself
// is enterable. This is the window the caller (e.g. authController.register)
// has to finish whatever the OTP was unlocking after verification succeeds.
export const POST_VERIFY_GRACE_MINUTES = 30;

import * as emailService from './emailService.js';

// displayName on the pre-registration path comes straight from an
// unauthenticated request body (sendRegistrationOtp) with no format
// validation applied before it reaches here — every other call site's
// displayName is a User.name that already passed validateRegister's
// letters-only pattern, but this template shouldn't rely on that holding
// for every future caller. Escaping here, once, covers all of them.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
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

  const rawOtp = generateOtp();
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[DEV OTP DEBUG] 🔑 Purpose: ${purpose} | Email: ${email} | Code: ${rawOtp}\n`);
  }
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const cooldownCutoff = new Date(Date.now() - RESEND_COOLDOWN_SEC * 1000);

  // Atomic cooldown check + write: only overwrite a record that's either
  // missing or older than the cooldown window. A plain findOne-then-write
  // has a gap two concurrent requests (e.g. a double-clicked "Resend") can
  // both slip through; this collapses the check and the write into one
  // conditional query so at most one of them wins.
  let record = await EmailOTP.findOneAndUpdate(
    { ...query, updatedAt: { $lt: cooldownCutoff } },
    { email, otpHash: hashedOtp, attempts: 0, expiresAt, usedAt: null, metadata },
    { new: true }
  );

  if (!record) {
    // Either no record exists yet (first-ever request for this query — safe
    // to create), or one exists and is still within the cooldown window.
    const existing = await EmailOTP.findOne(query);
    if (existing) {
      const elapsed = (Date.now() - existing.updatedAt.getTime()) / 1000;
      const waitTime = Math.ceil(RESEND_COOLDOWN_SEC - elapsed);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new code.`);
    }
    try {
      record = await EmailOTP.findOneAndUpdate(
        query,
        { email, otpHash: hashedOtp, attempts: 0, expiresAt, usedAt: null, metadata },
        { upsert: true, new: true }
      );
    } catch (err) {
      // Two truly-first-ever requests racing this upsert simultaneously —
      // the unique (userId|email, purpose) index lets exactly one create
      // the document, and the loser hits a duplicate-key error rather than
      // updating it. A generic retry message here (never the raw Mongo
      // error) is correct either way: the winner's code is now live.
      if (err.code === 11000) {
        throw new Error('A code was just requested — please check your email or try again in a moment.');
      }
      throw err;
    }
  }

  try {
    await emailService.sendOtpVerificationEmail({
      toEmail: email,
      account_email: email,
      otp_code: rawOtp,
      expiry_minutes: OTP_EXPIRY_MINUTES
    });
  } catch (err) {
    logger.error('Failed to send OTP email via emailService', { error: err.message, email });
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
    // Atomic increment rather than record.attempts += 1; record.save() —
    // concurrent guesses (e.g. someone scripting requests against the same
    // code) would otherwise all read the same stale count before any save
    // lands, letting more than maxAttempts guesses through before the
    // counter catches up.
    await EmailOTP.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    throw new Error('Invalid code.');
  }

  record.usedAt = new Date();
  // Extend the TTL past verification so the caller has POST_VERIFY_GRACE_MINUTES
  // to act on it (e.g. finish registration) — the code itself is already
  // consumed (usedAt set) and can't be verified again, this only keeps the
  // record (and its metadata) alive long enough to be read back.
  record.expiresAt = new Date(Date.now() + POST_VERIFY_GRACE_MINUTES * 60 * 1000);
  await record.save();

  return record.metadata;
}
