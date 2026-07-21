'use strict';

/**
 * @file controllers/auth.controller.js
 * Thin HTTP layer — delegates all business logic to auth.service.js.
 * Only handles: extracting request data, calling service, sending response.
 */

const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

// ── Cookie helper ─────────────────────────────────────────────────────────

const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    ...config.app.cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', config.app.cookieOptions);
};

// ── Handlers ──────────────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  const { user, accessToken, refreshToken } = await authService.register(
    { firstName, lastName, email, password, phone },
    req.ip
  );

  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(201, { user, accessToken }, 'Account created successfully').send(res);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(
    email,
    password,
    req.ip,
    req.headers['user-agent']
  );

  setRefreshTokenCookie(res, refreshToken);

  new ApiResponse(200, { user, accessToken }, 'Login successful').send(res);
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken, req.user.id, req.ip);
  }

  clearRefreshTokenCookie(res);

  new ApiResponse(200, null, 'Logged out successfully').send(res);
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    const ApiError = require('../utils/ApiError');
    throw ApiError.unauthorized('Refresh token not provided');
  }

  // Sprint 2: rotation returns BOTH new access + new refresh tokens
  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(token);

  // Rotate the cookie
  setRefreshTokenCookie(res, newRefreshToken);

  new ApiResponse(200, { accessToken }, 'Token refreshed').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  new ApiResponse(200, null, result.message).send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  new ApiResponse(200, null, 'Password reset successfully. Please log in.').send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  new ApiResponse(200, null, 'Email verified successfully').send(res);
});

const getMe = asyncHandler(async (req, res) => {
  // req.user is already populated by authenticate middleware
  new ApiResponse(200, { user: req.user }, 'Profile retrieved').send(res);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getMe,
};
