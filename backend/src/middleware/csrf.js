const crypto = require('crypto');

const CSRF_COOKIE = 'buzzforge_csrf';
const CSRF_HEADER = 'x-csrf-token';

// Safe HTTP methods that don't need CSRF protection
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Passport OAuth callback paths – they use the OAuth `state` parameter
// for CSRF protection and must not be blocked by our middleware
const OAUTH_CALLBACK_RE = /\/auth\/(google|github)\/callback/;

/**
 * Double-submit cookie CSRF protection.
 *
 * On every GET request a random token is set in a non-httpOnly cookie so
 * that the client-side JavaScript can read it.  On state-changing requests
 * (POST / PUT / PATCH / DELETE) the middleware verifies that the value in
 * the `x-csrf-token` header matches the cookie using a timing-safe compare.
 */
const csrfMiddleware = (req, res, next) => {
  // OAuth callbacks are protected by the OAuth state parameter – skip them
  if (OAUTH_CALLBACK_RE.test(req.path)) {
    return next();
  }

  // Ensure the CSRF cookie exists (refresh it on every safe request)
  if (!req.cookies?.[CSRF_COOKIE] || SAFE_METHODS.has(req.method)) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by JS
      secure: process.env.USER_COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path: '/'
    });

    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    // First POST before a GET – reject (no cookie yet)
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!headerToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);
    if (
      cookieBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  } catch (_) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  return next();
};

module.exports = csrfMiddleware;
