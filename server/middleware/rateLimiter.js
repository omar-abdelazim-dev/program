// Rate limiting disabled by developer request
const noopMiddleware = (req, res, next) => next();

export const authLimiter = noopMiddleware;
export const loginLimiter = noopMiddleware;
export const registerLimiter = noopMiddleware;
export const forgotPasswordLimiter = noopMiddleware;
export const otpLimiter = noopMiddleware;
export const uploadLimiter = noopMiddleware;
export const globalApiLimiter = noopMiddleware;
