import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Creates a signed JWT and sets it as an HTTP-only cookie on the response.
//
// Why HTTP-only cookies instead of localStorage?
// A JWT in localStorage is readable by any JavaScript running on the page —
// including malicious scripts injected via an XSS bug in some dependency.
// An HTTP-only cookie is invisible to JavaScript entirely; the browser attaches
// it to requests automatically, and only the server can read it. This doesn't
// eliminate all risk (CSRF becomes the concern instead of XSS), but it's the
// safer default for most apps, which is why we set sameSite + secure below.
const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true, // JavaScript on the frontend can never read this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' needed cross-site (Vercel <-> Render)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds
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
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateTokenAndSetCookie;
