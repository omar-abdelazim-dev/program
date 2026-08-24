import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

// Parses string like "30m", "7d" into ms
const parseDurationMs = (durationStr) => {
  if (typeof durationStr === 'number') return durationStr;
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const mult = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return val * mult[unit];
};

const generateTokenAndSetCookie = async (res, userId, req = null) => {
  const { AUTH_CONFIG } = await import('../config/security.js');

  const accessTokenMs = parseDurationMs(AUTH_CONFIG.ACCESS_TOKEN_LIFETIME);
  const refreshTokenMs = parseDurationMs(AUTH_CONFIG.REFRESH_TOKEN_LIFETIME);

  // 1. Generate Access Token (30m)
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
  });

  // 2. Generate Refresh Token (cryptographically secure random)
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // 3. Enforce Max Active Sessions (revoke oldest if at or over limit)
  const activeSessions = await Session.find({ userId, revoked: false }).sort('issuedAt');
  if (activeSessions.length >= AUTH_CONFIG.MAX_ACTIVE_SESSIONS) {
    const excess = activeSessions.length - AUTH_CONFIG.MAX_ACTIVE_SESSIONS + 1;
    for (let i = 0; i < excess; i++) {
      activeSessions[i].revoked = true;
      await activeSessions[i].save();
    }
  }

  // 4. Create New Session
  const session = await Session.create({
    userId,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + refreshTokenMs),
    ipAddress: req?.ip || 'Unknown IP',
    device: req?.get('user-agent') || 'Unknown Device',
  });

  // 5. Set Access Token Cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: accessTokenMs, // 30m
  });

  // 6. Set Refresh Token Cookie (strictly HttpOnly, longer lifetime)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth/refresh', // Restricted path
    maxAge: refreshTokenMs, // 7d
  });

  // 7. CSRF Cookie
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: accessTokenMs,
  });

  return { token, refreshToken, sessionId: session._id };
};

export default generateTokenAndSetCookie;
