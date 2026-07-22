import User from '../models/User.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import { logAudit } from '../utils/auditLogger.js';
import { checkPasswordPolicy } from '../validators/authValidators.js';
import { AUTH_CONSTANTS } from '../config/security.js';
import { generateVerificationToken, sendVerificationEmail } from '../services/emailVerificationService.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

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
    console.error(error);
    res.status(500).json({ message: 'Server error checking email' });
  }
};

// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
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
      university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills
    });

    // ─── Sprint 2: Email Verification ────────────────────────────────────────
    const { plainToken, hashedToken, expiresAt } = generateVerificationToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = expiresAt;
    await user.save(); // Do not bypass validation

    const origin = req.get('origin') || process.env.CLIENT_URL || 'http://localhost:5173';
    await sendVerificationEmail(user.email, plainToken, origin);

    // ─── Sprint 2: Session Tracking ──────────────────────────────────────────
    const { sessionId, refreshTokenHash } = await generateTokenAndSetCookie(res, user._id);
    
    // Cleanup expired
    user.activeSessions = user.activeSessions.filter(s => s.expiresAt > Date.now());

    user.activeSessions.push({
      sessionId,
      refreshTokenHash,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS),
      device: req.get('user-agent'),
      ipAddress: req.ip,
    });
    await user.save(); // Do not bypass validation

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
    console.error(error);
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
    // by default (select: false) — we explicitly ask for it here since we need
    // to compare it, but nowhere else in the app will it leak accidentally.
    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil +activeSessions');

    // ─── Sprint 2: Lockout Check ─────────────────────────────────────────────
    if (user && user.lockUntil) {
      if (user.lockUntil > Date.now()) {
        return res.status(423).json({ message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.' });
      } else {
        // Lock has expired. Reset the counters before checking the password.
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save(); // Safe save, lock expired
      }
    }

    // Deliberately vague error message: we don't say "email not found" vs
    // "wrong password" separately, so an attacker can't use this endpoint to
    // discover which emails are registered.
    if (!user || !(await user.comparePassword(password))) {
      // ─── Sprint 2: Increment Failed Attempts ───────────────────────────────
      if (user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION);
          await logAudit({
            action: 'ACCOUNT_LOCKED',
            module: 'auth',
            userId: user._id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            severity: 'warn',
          });
        }
        await user.save(); // Do not bypass validation
      }

      // Audit failed login attempt
      await logAudit({
        action: 'LOGIN_FAILURE',
        module: 'auth',
        userId: user?._id || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warn',
        metadata: { email: email.toLowerCase() },
      });
      return res.status(401).json({ message: 'Invalid email or password' });
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

    // ─── Sprint 2: Session Tracking & Reset Lockout ──────────────────────────
    const { sessionId, refreshTokenHash } = await generateTokenAndSetCookie(res, user._id, rememberMe !== false);
    
    // Reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    
    // Cleanup permanently expired sessions dynamically
    user.activeSessions = user.activeSessions.filter(s => s.expiresAt > Date.now());

    // Manage active sessions limit
    if (user.activeSessions.length >= AUTH_CONSTANTS.MAX_ACTIVE_SESSIONS) {
      // Remove the oldest session
      user.activeSessions.sort((a, b) => a.issuedAt - b.issuedAt);
      user.activeSessions.shift();
    }

    user.activeSessions.push({
      sessionId,
      refreshTokenHash,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS),
      device: req.get('user-agent'),
      ipAddress: req.ip,
    });
    
    await user.save(); // Do not bypass validation

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
      },
    });
  } catch (error) {
    console.error(error);
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
    path: '/api/auth/refresh',
  });
  // Also clear the CSRF token cookie on logout
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  if (req.user?.id) {
    // ─── Sprint 2: Revoke Session ────────────────────────────────────────────
    if (req.user.sessionId) {
      await User.updateOne(
        { _id: req.user.id, 'activeSessions.sessionId': req.user.sessionId },
        { $set: { 'activeSessions.$.revoked': true } }
      );
    }

    // Fire-and-forget audit log
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
    const { name, email, avatarUrl } = req.body;
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

    await user.save();

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @route   PATCH /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    // Server-side policy check (validators catch this first, but this is the
    // authoritative backstop — defence-in-depth).
    const policyError = checkPasswordPolicy(newPassword);
    if (policyError) {
      return res.status(400).json({ message: policyError });
    }

    // .select('+password') needed here too — see login() above for why.
    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      await logAudit({
        action: 'PASSWORD_CHANGE_FAILURE',
        module: 'auth',
        userId: req.user.id,
        targetId: req.user.id,
        targetModel: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'warn',
      });
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Just assign the plaintext new password and save — the model's own
    // pre('save') hook hashes it the same way it does on register, so the
    // hashing logic only ever lives in one place.
    user.password = newPassword;
    await user.save();

    // Audit successful password change
    await logAudit({
      action: 'PASSWORD_CHANGE_SUCCESS',
      module: 'auth',
      userId: req.user.id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

// @route   POST /api/auth/refresh
// @access  Public (Relies on refreshToken cookie)
export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token. Please log in.' });
    }

    const user = await User.findById(decoded.userId).select('+activeSessions +passwordChangedAt');
    if (!user || user.isBlocked) {
      return res.status(401).json({ message: 'User no longer exists or is blocked' });
    }

    // Cleanup expired sessions while we have the user loaded
    user.activeSessions = user.activeSessions.filter(s => s.expiresAt > Date.now());

    // Check if password changed since refresh token was issued
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      return res.status(401).json({ message: 'Session expired due to password change. Please log in.' });
    }

    // Find the session
    const sessionIndex = user.activeSessions.findIndex((s) => s.sessionId === decoded.sessionId);
    
    // ─── Sprint 2: Token Reuse & Grace Window ────────────────────────────────
    const currentHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (sessionIndex === -1 || user.activeSessions[sessionIndex].revoked) {
      // It's not the active token. Check if it's within the 30-second replay grace window
      const session = sessionIndex !== -1 ? user.activeSessions[sessionIndex] : null;
      
      // If the session exists, is revoked, but was just issued less than 30s ago,
      // this might be a network retry race condition.
      // We look at the 'issuedAt' timestamp. If the session was rotated < 30s ago, 
      // the 'issuedAt' of the NEW session is < 30s ago. But we only have the OLD token.
      // The easiest way to handle the grace period is to track a "lastRotatedAt" 
      // or simply accept that if we are within 30s of the *last* token issue, 
      // it might be a race.
      
      // Since we don't have a "lastRotatedAt" and to keep it simple: 
      // We check if the token's iat was very recent. But 'iat' is from when the OLD token was made.
      // Actually, if we're hitting a revoked session, we can just check if the session's 'issuedAt' 
      // (which represents the NEW token's creation time since we updated the session in-place) 
      // is within 30 seconds of Date.now().
      const isRaceCondition = session && (Date.now() - session.issuedAt.getTime() < 30000);

      if (isRaceCondition) {
        // Grace window: The frontend double-fired. Just return a generic success 
        // or return the exact same new tokens if we had them (we don't store plain tokens, so we can't).
        // Standard practice for grace period is to let the request succeed but NOT return new tokens,
        // or just return 401 but don't blow up the other sessions.
        // Returning 401 without terminating everything allows the first request's tokens to survive.
        return res.status(401).json({ message: 'Duplicate refresh request dropped.' });
      }

      await logAudit({
        action: 'TOKEN_REUSE',
        module: 'auth',
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'error',
      });
      
      // Revoke ALL sessions immediately
      user.activeSessions = [];
      await user.save();
      
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      res.clearCookie('csrfToken');
      return res.status(401).json({ message: 'Security violation detected. All sessions terminated.' });
    }

    // Verify token hash strictly matches what is in DB (Option A)
    if (user.activeSessions[sessionIndex].refreshTokenHash && 
        user.activeSessions[sessionIndex].refreshTokenHash !== currentHash) {
      return res.status(401).json({ message: 'Token mismatch. Please log in.' });
    }

    // ─── Sprint 2: Refresh Token Rotation (In-Place) ─────────────────────────
    const { sessionId, refreshTokenHash: newHash } = await generateTokenAndSetCookie(res, user._id, true);
    
    // Update the session in-place to avoid array churn
    user.activeSessions[sessionIndex].sessionId = sessionId;
    user.activeSessions[sessionIndex].refreshTokenHash = newHash;
    user.activeSessions[sessionIndex].issuedAt = new Date();
    user.activeSessions[sessionIndex].expiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS);
    user.activeSessions[sessionIndex].device = req.get('user-agent');
    user.activeSessions[sessionIndex].ipAddress = req.ip;
    
    await user.save();

    await logAudit({
      action: 'TOKEN_ROTATED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      // Audit failure without knowing the user
      await logAudit({ action: 'EMAIL_VERIFICATION_FAILED', module: 'auth', ipAddress: req.ip, severity: 'warn' });
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save(); // Do not bypass validation

    await logAudit({
      action: 'EMAIL_VERIFIED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      severity: 'info',
    });

    res.status(200).json({ message: 'Email successfully verified' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error verifying email' });
  }
};

// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+isEmailVerified');
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const { plainToken, hashedToken, expiresAt } = generateVerificationToken();
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    const origin = req.get('origin') || process.env.CLIENT_URL || 'http://localhost:5173';
    await sendVerificationEmail(user.email, plainToken, origin);

    res.status(200).json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error resending verification email' });
  }
};
