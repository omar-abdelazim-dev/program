import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Verifies the JWT stored in the 'token' cookie and attaches the user to
// req.user. Any route that needs "must be logged in" uses this first.
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    // Double-submit CSRF check: since the auth cookie can be sent cross-site
    // (sameSite:'none' in production), a mutating request must also prove it
    // came from our frontend by echoing the non-httpOnly csrfToken cookie back
    // as a header — something a third-party page can't read to forge.
    if (CSRF_PROTECTED_METHODS.includes(req.method)) {
      const csrfCookie = req.cookies.csrfToken;
      const csrfHeader = req.get('X-CSRF-Token');
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ message: 'Invalid or missing CSRF token' });
      }
    }

    // ─── JWT Hardening ───────────────────────────────────────────────────────
    // Strict algorithm enforcement prevents "none" algorithm attacks or
    // asymmetric key confusion attacks.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // Fetch the fresh user from the DB rather than trusting the token's
    // payload alone — this way, if a user's role changes or their account
    // is deleted after the token was issued, we catch it on every request.
    const user = await User.findById(decoded.userId).select('+passwordChangedAt');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    // ─── Password Change Session Invalidation ────────────────────────────────
    // If the token was issued BEFORE the password was last changed, reject it.
    // decoded.iat is in seconds, passwordChangedAt is in milliseconds.
    if (user.passwordChangedAt) {
      const issuedAtTimestamp = decoded.iat * 1000;
      const changedAtTimestamp = user.passwordChangedAt.getTime();
      
      // We allow a 1-second grace period in case the token was issued in the
      // exact same millisecond the password was changed (unlikely but safe).
      if (issuedAtTimestamp < changedAtTimestamp - 1000) {
        return res.status(401).json({ message: 'Session expired due to password change. Please log in again.' });
      }
    }

    req.user = {
      id: user._id,
      sessionId: decoded.sessionId, // Extracted from JWT
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token signature. Please log in again.' });
    }
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
