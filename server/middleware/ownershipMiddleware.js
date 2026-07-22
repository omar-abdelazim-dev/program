/**
 * IDOR (Insecure Direct Object Reference) ownership middleware.
 *
 * Verifies that the authenticated user owns the resource they are
 * trying to act on. Admins and superadmins bypass the check.
 *
 * Why 404 instead of 403?
 * Returning 403 ("Forbidden") on an IDOR confirms to an attacker that
 * the resource EXISTS but they can't access it, enabling enumeration.
 * Returning 404 hides existence entirely, denying that information.
 *
 * Usage in a route:
 *   router.patch(
 *     '/:id',
 *     protect,
 *     verifyOwnership(Course, 'id', 'instructor'),
 *     updateCourse
 *   );
 *
 * OWASP: A01:2021 – Broken Access Control
 */

import mongoose from 'mongoose';

/**
 * Factory that returns an Express middleware function.
 *
 * @param {mongoose.Model} Model      - The Mongoose model to look up
 * @param {string}         paramKey   - req.params key that holds the resource id (e.g. 'id', 'courseId')
 * @param {string}         ownerField - The field on the document that holds the owner's user id
 *                                      (e.g. 'instructor', 'student', 'user', '_id')
 *                                      Defaults to common field names if not specified.
 */
export const verifyOwnership = (Model, paramKey = 'id', ownerField = null) => {
  return async (req, res, next) => {
    try {
      // Admins and superadmins bypass ownership checks
      if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
        return next();
      }

      const resourceId = req.params[paramKey];

      // Validate the id is a proper ObjectId before hitting the DB
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const resource = await Model.findById(resourceId).lean();

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Resolve which field on the document holds the owner reference.
      // Try explicit ownerField first, then fall back to common field names.
      const candidateFields = ownerField
        ? [ownerField]
        : ['instructor', 'student', 'user', 'owner', 'author', 'createdBy'];

      let ownerIdOnDoc = null;
      for (const field of candidateFields) {
        if (resource[field] !== undefined) {
          ownerIdOnDoc = resource[field];
          break;
        }
      }

      // If no owner field found, deny by default (fail-closed)
      if (ownerIdOnDoc === null) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Compare as strings to handle both ObjectId and plain string ids
      if (ownerIdOnDoc.toString() !== req.user.id.toString()) {
        // Return 404 to avoid IDOR enumeration
        return res.status(404).json({ message: 'Resource not found' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
