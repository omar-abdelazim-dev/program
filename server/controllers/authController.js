import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import EmailOTP from '../models/EmailOTP.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import { logAudit } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';
import { requestOTP, verifyOTP, POST_VERIFY_GRACE_MINUTES } from '../utils/otpService.js';
import { validatePasswordStrength } from '../utils/passwordRules.js';
import { NAME_PATTERN } from '../validators/authValidators.js';
import { BCRYPT_ROUNDS } from '../config/security.js';

// @route   POST /api/auth/check-email
// @access  Public
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already exists' });
    }
    res.status(200).json({ message: 'Email is available' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error checking email' });
  }
};

// @route   POST /api/auth/send-registration-otp
// @access  Public
export const sendRegistrationOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    // This name gets emailed back as-is (see otpService's OTP email
    // template) before validateRegister ever runs on the real /register
    // call — an unauthenticated caller could otherwise put arbitrary
    // content in an email the app's trusted sender delivers. Same pattern
    // validateRegister already enforces at actual account creation.
    if (!NAME_PATTERN.test(name)) {
      return res.status(400).json({ message: 'Name can only contain letters and spaces' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }

    // Validate password strength
    const pwdError = validatePasswordStrength(password);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    await requestOTP({
      email,
      purpose: 'pre_register_verification',
      displayName: name
    });

    res.status(200).json({ message: 'OTP sent successfully to email.' });
  } catch (error) {
    logger.error('Error in sendRegistrationOtp', { error: error.message });
    res.status(400).json({ message: error.message });
  }
};

// @route   POST /api/auth/verify-registration-otp
// @access  Public
export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    await verifyOTP({
      email,
      purpose: 'pre_register_verification',
      otp
    });

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, major, university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Enforce pre-registration verification
    const otpRecord = await EmailOTP.findOne({ email, purpose: 'pre_register_verification' });
    if (!otpRecord || !otpRecord.usedAt) {
      return res.status(403).json({ message: 'Email address not verified. Please verify your email first.' });
    }
    const timeSinceVerification = (Date.now() - otpRecord.usedAt.getTime()) / 1000 / 60;
    if (timeSinceVerification > POST_VERIFY_GRACE_MINUTES) {
      return res.status(403).json({ message: 'Verification expired. Please restart registration.' });
    }

    // Only allow 'student' or 'instructor' at signup — nobody should be able
    // to register themselves as 'admin' through a public form. Admins are
    // created manually (e.g. directly in the DB or by another admin).
    const safeRole = role === 'instructor' ? 'instructor' : 'student';

    // Verify system configurations for registration
    const config = await getInternalConfig();
    
    if (safeRole === 'student' && !config.registration?.studentRegistration) {
      return res.status(403).json({ message: 'Student registration is currently disabled by administrators.' });
    }
    
    if (safeRole === 'instructor' && !config.registration?.instructorRegistration) {
      return res.status(403).json({ message: 'Instructor registration is currently disabled by administrators.' });
    }
    
    if (config.registration?.eduEmailOnly && !email.toLowerCase().endsWith('.edu')) {
      return res.status(403).json({ message: 'Only .edu email addresses are allowed to register.' });
    }

    const user = await User.create({
      name, email, password, role: safeRole, phone: phone || '',
      major, university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills,
      isVerified: true,
    });

    // Cleanup OTP record
    await EmailOTP.deleteOne({ _id: otpRecord._id });

    await generateTokenAndSetCookie(res, user._id, req);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // .select('+password') is needed because the User model excludes password
    const user = await User.findOne({ email }).select('+password');
    
    // Deliberately checked before the password: a locked-out user by
    // definition may not have their correct password to offer, so gating
    // this disclosure behind a correct password would make the account
    // unrecoverable through the UI. This does mean a locked account's
    // existence is disclosed pre-auth — an accepted, common tradeoff (see
    // the isVerified check below, which is NOT given the same pass, since
    // there's no equivalent recovery reason to reveal it pre-auth).
    if (user && user.lockedForReset) {
      await logAudit({
        action: 'LOGIN_BLOCKED_PENDING_RESET',
        module: 'auth',
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warn',
      });
      return res.status(423).json({ message: 'Account is locked due to multiple failed login attempts. Please reset your password.', code: 'LOCKED_PENDING_RESET' });
    }

    if (!user || !(await user.comparePassword(password))) {
      // Handle lockout
      if (user) {
        user.failedLoginAttempts += 1;
        
        if (user.failedLoginAttempts >= 5) {
          user.lockedForReset = true;
          user.lockedAt = new Date();
          await logAudit({
            action: 'ACCOUNT_LOCKED_FOR_RESET',
            module: 'auth',
            userId: user._id,
            ipAddress: req.ip,
            severity: 'warn'
          });
        }
        await user.save();

        if (user.lockedForReset) {
          return res.status(423).json({ message: 'Account is locked due to multiple failed login attempts. Please reset your password.', code: 'LOCKED_PENDING_RESET' });
        }
      }

      await logAudit({
        action: 'LOGIN_FAILURE',
        module: 'auth',
        userId: user?._id || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warn',
        metadata: { email: email.toLowerCase() },
      });
      // Always a real number, including for an email that isn't registered
      // at all (reported as if it were a fresh account's first failed
      // attempt) — an `undefined` here would be dropped by res.json
      // entirely, and the key's mere presence/absence would enumerate
      // which emails are registered just as effectively as the message
      // text would.
      const remainingAttempts = user ? Math.max(0, 5 - user.failedLoginAttempts) : 4;
      return res.status(401).json({
        message: 'Invalid email or password',
        remainingAttempts
      });
    }

    // Successful login: reset lockout counters
    if (user.failedLoginAttempts > 0 || user.lockedForReset) {
      user.failedLoginAttempts = 0;
      user.lockedForReset = false;
      user.lockedAt = undefined;
      await user.save();
    }

    // Only reveal verification status once the password has already been
    // proven correct — checking this earlier turns login into an oracle an
    // attacker can use to enumerate registered emails and their
    // verification state without ever knowing a valid password.
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Your email address is not verified.', code: 'EMAIL_NOT_VERIFIED' });
    }

    if (user.isBlocked) {
      await logAudit({
        action: 'LOGIN_BLOCKED',
        module: 'auth',
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warn',
        metadata: { email: user.email },
      });
      return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
    }

    const config = await getInternalConfig();
    if (config.security?.maintenanceLock && user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Platform is locked for maintenance. Only Super Admins can log in.' });
    }

    await generateTokenAndSetCookie(res, user._id, req);

    // Audit successful login
    await logAudit({
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      userId: user._id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      metadata: { role: user.role },
    });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isProgramInstructor: user.isProgramInstructor, // Include Program instructor flag
      },
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth/refresh'
  });
  // Also clear the CSRF token cookie on logout
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  // Revoke session if refreshToken was provided
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const crypto = await import('crypto');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const Session = (await import('../models/Session.js')).default;
      await Session.findOneAndUpdate(
        { refreshTokenHash },
        { revoked: true }
      );
    } catch (e) {
      logger.error('Error revoking session on logout:', { error: e.message, stack: e.stack });
    }
  }

  // Fire-and-forget audit log — logout doesn't need to wait for it
  if (req.user?.id) {
    logAudit({
      action: 'LOGOUT',
      module: 'auth',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });
  }

  res.status(200).json({ message: 'Logged out successfully' });
};

// @route   GET /api/auth/me
// @access  Private (requires valid cookie — see middleware/authMiddleware.js)
export const getMe = async (req, res) => {
  // req.user is attached by the `protect` middleware after verifying the cookie.
  // By the time we get here, we already know the user is authenticated.
  res.status(200).json({ user: req.user });
};

// @route   PATCH /api/auth/profile
// @access  Private — a user editing their own name/email/avatar (Settings page)
export const updateProfile = async (req, res) => {
  try {
    const { name, lastName, email, avatarUrl, college, major, providedCourses, linkedinUrl, socialUrl, phone, university, goalsText } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      user.name = name.trim();
    }

    if (email !== undefined && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'An account with this email already exists' });
      }
      user.email = email;
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl;
    }

    if (college !== undefined) user.college = college;
    if (major !== undefined) user.major = major;
    if (providedCourses !== undefined) user.providedCourses = providedCourses;
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
    if (socialUrl !== undefined) user.socialUrl = socialUrl;
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (university !== undefined) user.university = university.trim();
    if (goalsText !== undefined) user.goalsText = goalsText.trim();

    await user.save();

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        college: user.college,
        major: user.major,
        providedCourses: user.providedCourses,
        linkedinUrl: user.linkedinUrl,
        socialUrl: user.socialUrl,
        phone: user.phone,
        university: user.university,
        goalsText: user.goalsText,
        isProgramInstructor: user.isProgramInstructor, // Include Program instructor flag
      },
    });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @route   POST /api/auth/change-password/request-otp
// @access  Private
export const requestChangePasswordOtp = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required' });
    if (currentPassword === newPassword) return res.status(400).json({ message: 'New password cannot be the same as the current password' });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.lockedForReset) return res.status(403).json({ message: 'Account is locked. Please use the reset password flow instead.' });

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) return res.status(400).json({ message: policyError });

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    try {
      await requestOTP({
        userId: user._id,
        email: user.email,
        purpose: 'password_change',
        metadata: { newPasswordHash: hashedPassword },
        displayName: user.name
      });
    } catch (otpErr) {
      return res.status(400).json({ message: otpErr.message });
    }

    res.status(200).json({ message: 'An OTP has been sent to your email to confirm the change.' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error requesting password change' });
  }
};

// @route   POST /api/auth/change-password/verify-otp
// @access  Private
export const verifyChangePasswordOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let metadata;
    try {
      metadata = await verifyOTP({ userId: user._id, purpose: 'password_change', otp });
    } catch (otpErr) {
      return res.status(400).json({ message: otpErr.message });
    }

    if (!metadata || !metadata.newPasswordHash) {
      return res.status(400).json({ message: 'Invalid OTP metadata' });
    }

    // updateOne bypasses the pre('save') hook that normally stamps
    // passwordChangedAt on every password write — set it explicitly here,
    // since protect (authMiddleware.js) uses that field to invalidate JWTs
    // issued before the change. Without it, a token stolen before this
    // change keeps working right through it.
    await User.updateOne({ _id: user._id }, { $set: { password: metadata.newPasswordHash, passwordChangedAt: new Date() } });

    const Session = (await import('../models/Session.js')).default;
    await Session.updateMany({ userId: user._id }, { revoked: true });
    res.clearCookie('token');
    // Cookie identity includes path — refreshToken was set with a
    // restricted path (utils/generateToken.js), so clearing it without the
    // matching path option (the default '/') sets an unrelated deletion
    // cookie and leaves the real one intact in the browser. See refresh()'s
    // token-reuse handler below for the correct pattern this now matches.
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.clearCookie('csrfToken');

    await logAudit({
      action: 'PASSWORD_CHANGE_SUCCESS',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error verifying password change' });
  }
};

// @route   POST /api/auth/reset-password/request-otp
// @access  Public
export const requestPasswordResetOtp = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password are required' });

    // Checked before the account lookup, and deliberately still returned as
    // a real 400 either way: this only depends on the submitted password
    // string, never on whether the account exists, so it can't be used to
    // enumerate emails the way returning it *after* a conditional existence
    // check would (existing account -> specific policy error; non-existent
    // account -> generic 200 — the difference itself is the leak).
    const policyError = validatePasswordStrength(newPassword);
    if (policyError) return res.status(400).json({ message: policyError });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ message: 'If an account with that email exists, an OTP has been sent.' });
    }

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    try {
      await requestOTP({
        userId: user._id,
        email: user.email,
        purpose: 'password_reset',
        metadata: { newPasswordHash: hashedPassword },
        displayName: user.name
      });
    } catch (otpErr) {
      return res.status(400).json({ message: otpErr.message });
    }

    await logAudit({
      action: 'PASSWORD_RESET_REQUESTED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'If an account with that email exists, an OTP has been sent.' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/auth/reset-password/verify-otp
// @access  Public
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    // 'No active code found' from verifyOTP below means "this account
    // exists but never called request-otp" — distinct from a non-existent
    // account only if we let the two produce different messages. A user
    // who legitimately got this far already passed request-otp (which
    // returns the same response regardless of account existence), so
    // *this* specific pairing is the one enumeration risk on this
    // endpoint; other verifyOTP errors (wrong/expired/reused code, too
    // many attempts) are safe to report accurately since reaching them at
    // all already implies request-otp succeeded.
    const genericInvalid = { message: 'Invalid or expired code.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json(genericInvalid);

    let metadata;
    try {
      metadata = await verifyOTP({ userId: user._id, purpose: 'password_reset', otp });
    } catch (otpErr) {
      if (otpErr.message === 'No active code found. Please request a new one.') {
        return res.status(400).json(genericInvalid);
      }
      return res.status(400).json({ message: otpErr.message });
    }

    if (!metadata || !metadata.newPasswordHash) {
      return res.status(400).json({ message: 'Invalid OTP metadata' });
    }

    // See the same fix in verifyChangePasswordOtp above — updateOne skips
    // the pre('save') hook that stamps passwordChangedAt, so it has to be
    // set explicitly or a token issued before this reset keeps working.
    // Doubly important here: this is the account-recovery path for a
    // locked-out or compromised account.
    await User.updateOne({ _id: user._id }, {
      $set: {
        password: metadata.newPasswordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedForReset: false,
        lockedAt: null
      }
    });

    const Session = (await import('../models/Session.js')).default;
    await Session.updateMany({ userId: user._id }, { revoked: true });

    await logAudit({
      action: 'PASSWORD_RESET_SUCCESS',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

// @route   POST /api/auth/refresh
// @access  Public (Requires refreshToken cookie)
export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const Session = (await import('../models/Session.js')).default;
    
    const session = await Session.findOne({ refreshTokenHash });
    if (!session) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (session.revoked) {
      // Possible token theft / replay attack
      await Session.updateMany({ userId: session.userId }, { revoked: true });
      await logAudit({
        action: 'TOKEN_REUSE',
        module: 'auth',
        userId: session.userId,
        ipAddress: req.ip,
        severity: 'error',
        metadata: { sessionId: session._id }
      });
      res.clearCookie('token');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(401).json({ message: 'Security violation: Refresh token reused. All sessions revoked.' });
    }

    if (session.expiresAt < Date.now()) {
      session.revoked = true;
      await session.save();
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(session.userId);
    if (!user || user.isBlocked) {
      return res.status(401).json({ message: 'User invalid or blocked' });
    }

    // Mark current session as revoked so it can't be used again (Rotation)
    // We allow a small grace period for concurrent requests? 
    // Actually, destroying the session and creating a new one is safer, but let's just revoke it.
    session.revoked = true;
    await session.save();
    
    // Create new session via generateTokenAndSetCookie
    await generateTokenAndSetCookie(res, user._id, req);

    await logAudit({
      action: 'TOKEN_ROTATED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error during refresh' });
  }
};

// @route   GET /api/auth/sessions
// @access  Private
export const getSessions = async (req, res) => {
  try {
    const Session = (await import('../models/Session.js')).default;
    const sessions = await Session.find({ userId: req.user.id, revoked: false }).select('-refreshTokenHash');
    res.status(200).json({ sessions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const revokeSession = async (req, res) => {
  try {
    const Session = (await import('../models/Session.js')).default;
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    session.revoked = true;
    await session.save();
    
    await logAudit({
      action: 'SESSION_REVOKED',
      module: 'auth',
      userId: req.user.id,
      ipAddress: req.ip,
      severity: 'info',
      metadata: { sessionId: session._id }
    });

    res.status(200).json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/auth/sessions
// @access  Private
export const revokeAllSessions = async (req, res) => {
  try {
    const Session = (await import('../models/Session.js')).default;
    await Session.updateMany({ userId: req.user.id }, { revoked: true });
    
    await logAudit({
      action: 'SESSION_REVOKED_ALL',
      module: 'auth',
      userId: req.user.id,
      ipAddress: req.ip,
      severity: 'info'
    });

    res.status(200).json({ message: 'All sessions revoked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'User not found' });
    
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified' });

    try {
      await verifyOTP({ userId: user._id, purpose: 'register_verification', otp });
    } catch (otpErr) {
      return res.status(400).json({ message: otpErr.message });
    }

    user.isVerified = true;
    await user.save();

    await logAudit({
      action: 'EMAIL_VERIFIED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// @route   POST /api/auth/resend-verification
// @access  Public
// Public (no session) so a user bounced from /login with EMAIL_NOT_VERIFIED
// can request a code without being logged in. The response is deliberately
// identical whether the account exists, is already verified, or the OTP was
// actually sent — same enumeration-resistance pattern as
// requestPasswordResetOtp above; a differentiated 404/400/200 here would let
// anyone probe arbitrary emails for their registration/verification status.
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const genericResponse = { message: 'If that account needs verification, a code has been sent.' };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.isVerified) {
      return res.status(200).json(genericResponse);
    }

    try {
      await requestOTP({
        userId: user._id,
        email: user.email,
        purpose: 'register_verification',
        displayName: user.name
      });
    } catch (otpErr) {
      return res.status(400).json({ message: otpErr.message });
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    logger.error('An error occurred', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error resending verification' });
  }
};

// Role changes (promote/demote) now live under a single
// PATCH /api/admin/users/:id/role endpoint — see adminController.js's
// changeUserRole.
