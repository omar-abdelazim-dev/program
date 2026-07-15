import User from '../models/User.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';

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

    const user = await User.create({ 
      name, email, password, role: safeRole, phone: phone || '',
      university, college, year, track, providedCourses, linkedinUrl, socialUrl, goalsText, selectedPills
    });

    generateTokenAndSetCookie(res, user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
    const { email, password } = req.body;

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
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
    }

    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
  res.status(200).json({ message: 'Logged out successfully' });
};

// @route   GET /api/auth/me
// @access  Private (requires valid cookie — see middleware/authMiddleware.js)
export const getMe = async (req, res) => {
  // req.user is attached by the `protect` middleware after verifying the cookie.
  // By the time we get here, we already know the user is authenticated.
  res.status(200).json({ user: req.user });
};

// @route   PATCH /api/auth/promote
// @access  Private (Admin only)
export const promoteToAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'admin';
    await user.save();

    res.status(200).json({ message: 'User promoted to admin successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error promoting user' });
  }
};

// @route   PATCH /api/auth/promote-instructor
// @access  Private (Admin only)
export const promoteToInstructor = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'instructor';
    await user.save();

    res.status(200).json({ message: 'User promoted to instructor successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error promoting user' });
  }
};

// @route   PATCH /api/auth/promote-superadmin
// @access  Private (Super Admin only)
export const promoteToSuperAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'superadmin';
    await user.save();

    res.status(200).json({ message: 'User promoted to super admin successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error promoting user' });
  }
};
