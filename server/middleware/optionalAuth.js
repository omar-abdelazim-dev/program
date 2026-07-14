import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Unlike `protect`, this does NOT reject the request if there's no cookie —
// it just attaches req.user if a valid one exists, and moves on either way.
// Used on the course-details route, which is public but shows extra info
// (e.g. a pending course) to its owning instructor or an admin.
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = { id: user._id, name: user.name, email: user.email, role: user.role };
    }
    next();
  } catch (error) {
    // Invalid/expired token on a public route — just treat as logged-out
    // rather than blocking the request.
    next();
  }
};
