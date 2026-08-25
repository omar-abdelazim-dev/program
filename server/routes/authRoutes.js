import express from "express";
import {
  register,
  login,
  adminLogin,
  superadminLogin,
  logout,
  getMe,
  checkEmail,
  updateProfile,
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  refresh,
  getSessions,
  revokeSession,
  revokeAllSessions,
  verifyEmail,
  resendVerification,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  authLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
} from "../middleware/rateLimiter.js";
import {
  validateRegister,
  validateLogin,
  validateCheckEmail,
  validateUpdateProfile,
} from "../validators/authValidators.js";

const router = express.Router();

// authLimiter on check-email: prevents email enumeration via timing side-channel
router.post("/check-email", authLimiter, validateCheckEmail, checkEmail);

// Registration & Pre-registration OTP
router.post("/send-registration-otp", authLimiter, sendRegistrationOtp);
// otpLimiter (5/15min, tighter than authLimiter's 10/15min): guessing a
// 6-digit code is exactly the brute-force pattern this limiter exists for.
router.post("/verify-registration-otp", otpLimiter, verifyRegistrationOtp);

// registerLimiter: tighter than authLimiter — 3 registrations/hour per IP
router.post("/register", registerLimiter, validateRegister, register);

// Email Verification
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

// loginLimiter: 5 attempts/15 min — hardest protection against brute-force
router.post("/login", loginLimiter, validateLogin, login);
router.post("/admin/login", loginLimiter, validateLogin, adminLogin);
router.post("/superadmin/login", loginLimiter, validateLogin, superadminLogin);
router.post("/logout", logout);
router.post("/refresh", authLimiter, refresh); // Protect refresh against brute-force
router.get("/me", protect, getMe); // protect runs first — if it fails, getMe never runs

// Session Management
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.delete("/sessions", protect, revokeAllSessions);

router.patch("/profile", protect, validateUpdateProfile, updateProfile);

router.post(
  "/change-password/request-otp",
  protect,
  authLimiter,
  requestChangePasswordOtp,
);
router.post(
  "/change-password/verify-otp",
  protect,
  otpLimiter,
  verifyChangePasswordOtp,
);

router.post(
  "/reset-password/request-otp",
  forgotPasswordLimiter,
  requestPasswordResetOtp,
);
router.post("/reset-password/verify-otp", otpLimiter, verifyPasswordResetOtp);

export default router;
