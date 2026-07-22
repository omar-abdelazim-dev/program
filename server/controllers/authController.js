import User from '../models/User.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';
import { getInternalConfig } from '../utils/configFetcher.js';
import { logAudit } from '../utils/auditLogger.js';
import { checkPasswordPolicy } from '../validators/authValidators.js';

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

// Role changes (promote/demote) now live under a single
// PATCH /api/admin/users/:id/role endpoint — see adminController.js's
// changeUserRole.
