import crypto from 'crypto';
import User from '../models/User.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import { logAudit } from '../utils/auditLogger.js';
import { checkPasswordPolicy } from '../validators/authValidators.js';
import logger from '../utils/logger.js';

const RESET_TOKEN_EXPIRY_MINUTES = 30;

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
    const { name, email, password, role, phone, major, university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills } = req.body;

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
      major, university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills
    });

    await generateTokenAndSetCookie(res, user._id);

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
    const user = await User.findOne({ email }).select('+password');

    // Deliberately vague error message: we don't say "email not found" vs
    // "wrong password" separately, so an attacker can't use this endpoint to
    // discover which emails are registered.
    if (!user || !(await user.comparePassword(password))) {
      // Audit failed login attempt (no userId — attacker may not have one)
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

    await generateTokenAndSetCookie(res, user._id, rememberMe !== false);

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
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @route   POST /api/auth/logout
// @access  Private
export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  // Also clear the CSRF token cookie on logout
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

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

// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always respond identically whether or not the account exists —
    // otherwise this endpoint becomes an email-enumeration oracle.
    if (user) {
      // Storing only a hash (not the raw token) means a database leak alone
      // can't be used to reset the account — the raw token only ever exists
      // in the emailed link. Overwriting the single stored token/expiry pair
      // is also what invalidates any previous unexpired reset link.
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.resetPasswordExpires = Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000;
      await user.save();

      // No email provider is configured for this MVP — log the reset link
      // the way a real provider's delivery would surface it, instead of
      // emailing it.
      const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
      const resetLink = `${clientOrigin}/reset-password/${rawToken}`;
      logger.info(`Password reset requested for ${user.email}`, { resetLink, expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES });

      await logAudit({
        action: 'PASSWORD_RESET_REQUESTED',
        module: 'auth',
        userId: user._id,
        targetId: user._id,
        targetModel: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'info',
      });
    }

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
};

// @route   PATCH /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Just assign the plaintext new password — the model's pre('save') hook
    // hashes it, same as register()/changePassword() above.
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await logAudit({
      action: 'PASSWORD_RESET_SUCCESS',
      module: 'auth',
      userId: user._id,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'warn',
    });

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

// Role changes (promote/demote) now live under a single
// PATCH /api/admin/users/:id/role endpoint — see adminController.js's
// changeUserRole.
