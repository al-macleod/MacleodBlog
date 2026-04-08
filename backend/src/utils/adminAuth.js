const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const cookieName = process.env.ADMIN_COOKIE_NAME || 'buzzforge_admin_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.ADMIN_COOKIE_SECURE === 'true',
  sameSite: process.env.ADMIN_COOKIE_SAME_SITE || 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7
});

const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.ADMIN_COOKIE_SECURE === 'true',
  sameSite: process.env.ADMIN_COOKIE_SAME_SITE || 'lax'
});

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const validateAdminCredentials = (username, password) => {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
};

const createAdminToken = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ role: 'admin' }, secret, { expiresIn: '7d' });
};

const verifyAdminToken = (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, secret);
};

module.exports = {
  cookieName,
  getCookieOptions,
  getClearCookieOptions,
  validateAdminCredentials,
  createAdminToken,
  verifyAdminToken
};