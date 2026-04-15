const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Access token – short-lived, stored in httpOnly cookie
const cookieName = process.env.USER_COOKIE_NAME || 'buzzforge_user_token';
// Refresh token – long-lived, stored in a separate httpOnly cookie
const refreshCookieName = process.env.USER_REFRESH_COOKIE_NAME || 'buzzforge_refresh_token';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 14;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USER_COOKIE_SECURE === 'true',
  sameSite: process.env.USER_COOKIE_SAME_SITE || 'lax',
  maxAge: 1000 * 60 * 20 // 20 min (slightly longer than JWT TTL for clock skew)
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USER_COOKIE_SECURE === 'true',
  sameSite: process.env.USER_COOKIE_SAME_SITE || 'lax',
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: '/'
});

const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USER_COOKIE_SECURE === 'true',
  sameSite: process.env.USER_COOKIE_SAME_SITE || 'lax'
});

const createUserToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL });
};

const verifyUserToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, secret);
};

// Generate a cryptographically random refresh token and return
// both the raw value (to send to client) and its SHA-256 hash (to store in DB).
const generateRefreshToken = () => {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  return { raw, hash, expiresAt };
};

module.exports = {
  cookieName,
  refreshCookieName,
  getCookieOptions,
  getRefreshCookieOptions,
  getClearCookieOptions,
  createUserToken,
  verifyUserToken,
  generateRefreshToken
};