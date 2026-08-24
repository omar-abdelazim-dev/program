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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('+passwordChangedAt');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      // Give a tiny 1-second grace period in case they were generated on the exact same second
      if (decoded.iat < changedTimestamp - 1) {
        return res.status(401).json({ message: 'Session invalidated. Password was recently changed. Please log in again.' });
      }
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Your email address is not verified.', code: 'EMAIL_NOT_VERIFIED' });
    }

    req.user = {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      college: user.college,
      major: user.major,
      academicType: user.academicType,
      academicGroup: user.academicGroup,
      providedCourses: user.providedCourses,
      instructorStatus: user.instructorStatus,
      linkedinUrl: user.linkedinUrl,
      socialUrl: user.socialUrl,
      phone: user.phone,
      university: user.university,
      goalsText: user.goalsText,
      isProgramInstructor: user.isProgramInstructor, // Include Program instructor flag
      doorScope: decoded.doorScope || null,
    };
    req.authScope = decoded.doorScope || null;
    if ((user.role === 'admin' && req.authScope !== 'admin') || (user.role === 'superadmin' && req.authScope !== 'superadmin')) {
      return res.status(401).json({ message: 'Legacy or mismatched staff session. Please log in through the correct door.' });
    }

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

// Staff routes must accept a token minted by the matching staff door.
// Unscoped legacy tokens intentionally fail here and require re-login.
export const authorizeDoor = (...allowedRoles) => {
  const expectedScope = {
    admin: 'admin',
    superadmin: 'superadmin',
  };

  return (req, res, next) => {
    const role = req.user?.role;
    if (!allowedRoles.includes(role) || req.authScope !== expectedScope[role]) {
      return res.status(403).json({ message: 'This session is not valid for this staff door' });
    }
    next();
  };
};

// Mixed routes can retain ordinary role access while still requiring the
// correct scoped door whenever the caller is staff.
export const authorizeWithDoor = (...allowedRoles) => {
  const staffRoles = ['admin', 'superadmin'];
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: `Role '${req.user?.role}' is not authorized to access this resource` });
    }
    if (staffRoles.includes(req.user.role)) {
      return authorizeDoor(req.user.role)(req, res, next);
    }
    next();
  };
};

/**
 * Centralized IDOR / Ownership Middleware
 * Replaces fragile manual checks in controllers.
 * 
 * @param {mongoose.Model} Model - The Mongoose model to query
 * @param {string} idParamName - The name of the route parameter containing the resource ID (e.g. 'id')
 * @param {string} ownerField - The field on the document containing the owner's user ID
 */
export const verifyOwnership = (Model, idParamName = 'id', ownerField = 'instructor') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParamName];
      const doc = await Model.findById(resourceId);
      
      if (!doc) {
        // We return 404 instead of 403. While this slightly enables 404 enumeration,
        // it's an accepted tradeoff per the security assessment for standard REST behavior.
        return res.status(404).json({ message: 'Resource not found' });
      }

      const isOwner = doc[ownerField] && doc[ownerField].toString() === req.user.id.toString();
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

      if (!isOwner && !isAdmin) {
        import('../utils/auditLogger.js').then(({ logAudit }) => {
          logAudit({
            action: 'UNAUTHORIZED_RESOURCE_ACCESS',
            module: 'auth',
            userId: req.user.id,
            targetId: resourceId,
            targetModel: Model.modelName,
            ipAddress: req.ip,
            severity: 'warn'
          });
        });
        return res.status(403).json({ message: 'Not authorized to access this resource' });
      }

      // Attach to request so the controller doesn't have to query the DB again
      req.resource = doc;
      next();
    } catch (error) {
      next(error); // Let global error handler deal with CastErrors etc.
    }
  };
};
