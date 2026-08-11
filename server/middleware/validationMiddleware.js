import mongoose from 'mongoose';

/**
 * Validates that the specified request parameters are valid MongoDB ObjectIds.
 * Returns 400 Bad Request if any of the specified parameters are invalid.
 * 
 * @param  {...string} paramNames - The names of the req.params to validate
 */
export const validateObjectId = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      // Only validate if the parameter is actually present in the request
      if (id !== undefined && !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: `Invalid ${paramName} format` });
      }
    }
    next();
  };
};
