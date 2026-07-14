import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verifies the JWT stored in the 'token' cookie and attaches the user to
// req.user. Any route that needs "must be logged in" uses this first.
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the fresh user from the DB rather than trusting the token's
    // payload alone — this way, if a user's role changes or their account
    // is deleted after the token was issued, we catch it on every request.
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    // Covers expired tokens, tampered tokens, malformed tokens — all treated
    // the same way from the client's perspective: "you're not logged in".
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
};

// Usage: router.post('/courses', protect, authorize('instructor'), createCourse)
// Must run AFTER `protect`, since it relies on req.user already being set.
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
