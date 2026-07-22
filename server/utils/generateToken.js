import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getInternalConfig } from './configFetcher.js';

// Creates signed JWTs, generates a session ID, and sets cookies on the response.
// Extended in Sprint 2 to support Refresh Tokens alongside the original Access Token.
// Backward compatibility is preserved by returning the accessToken and still
// setting the 'token' cookie exactly as before.
const generateTokenAndSetCookie = async (res, userId, rememberMe = true) => {
  const config = await getInternalConfig();
  
  // Unique session ID to track this specific device/login occurrence
  const sessionId = crypto.randomUUID();

  // Expiration logic
  const jwtExpirationDays = config?.security?.jwtExpiration || 7;
  const accessMaxAge = rememberMe ? jwtExpirationDays * 24 * 60 * 60 * 1000 : undefined;
  const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined; // Refresh token lives 7 days

  // Access Token: Original lifetime restored to preserve backward compatibility
  // The frontend has no silent refresh interceptor yet.
  const accessToken = jwt.sign({ userId, sessionId }, process.env.JWT_SECRET, {
    expiresIn: `${jwtExpirationDays}d`,
  });

  // Refresh Token: Long lived (e.g. 7d)
  const refreshToken = jwt.sign({ userId, sessionId }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_LIFETIME || '7d',
  });

  // Option A: Hash the refresh token for secure database storage
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Access Token Cookie (existing frontend integration point)
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: accessMaxAge,
  });

  // Refresh Token Cookie (new in Sprint 2, invisible to existing frontend)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: refreshMaxAge,
    path: '/api/auth/refresh', // Strict path so it only sends when refreshing
  });

  // Double-submit CSRF cookie
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: accessMaxAge,
  });

  return { accessToken, refreshToken, refreshTokenHash, sessionId };
};

export default generateTokenAndSetCookie;
