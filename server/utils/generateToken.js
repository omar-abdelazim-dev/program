import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getInternalConfig } from './configFetcher.js';

// Creates a signed JWT and sets it as an HTTP-only cookie on the response.
//
// Why HTTP-only cookies instead of localStorage?
// A JWT in localStorage is readable by any JavaScript running on the page —
// including malicious scripts injected via an XSS bug in some dependency.
// An HTTP-only cookie is invisible to JavaScript entirely; the browser attaches
// it to requests automatically, and only the server can read it. This doesn't
// eliminate all risk (CSRF becomes the concern instead of XSS), but it's the
// safer default for most apps, which is why we set sameSite + secure below.
// rememberMe (default true — unchanged behavior for register() and any other
// caller that doesn't pass it) controls whether the cookie persists across
// browser restarts. The JWT itself is always valid for the same duration
// either way; what changes is whether the *cookie* survives closing the
// browser (maxAge set) or not (session cookie, no maxAge). Token duration
// itself comes from SystemConfig (security.jwtExpiration), admin-configurable,
// falling back to 7 days.
const generateTokenAndSetCookie = async (res, userId, rememberMe = true) => {
  const config = await getInternalConfig();
  const jwtExpirationDays = config?.security?.jwtExpiration || 7;

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: `${jwtExpirationDays}d`,
  });

  const maxAge = rememberMe ? jwtExpirationDays * 24 * 60 * 60 * 1000 : undefined; // configured duration, or a session cookie

  res.cookie('token', token, {
    httpOnly: true, // JavaScript on the frontend can never read this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed cross-site (Vercel <-> Render)
    maxAge,
  });

  // Double-submit CSRF cookie: sameSite:'none' in production means the browser
  // will happily attach the auth cookie to a cross-site request, so the cookie
  // alone can no longer prove the request came from our frontend. This second
  // cookie must be readable by frontend JS (httpOnly: false) so it can be echoed
  // back as a header — a third-party page can trigger the request but can't
  // read this cookie's value to forge the header.
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge,
  });

  return token;
};

export default generateTokenAndSetCookie;
