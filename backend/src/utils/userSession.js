const jwt = require('jsonwebtoken');

const cookieName = process.env.USER_COOKIE_NAME || 'buzzforge_user_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.USER_COOKIE_SECURE === 'true',
  sameSite: process.env.USER_COOKIE_SAME_SITE || 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 14
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

  return jwt.sign(payload, secret, { expiresIn: '14d' });
};

const verifyUserToken = (token) => {
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
  createUserToken,
  verifyUserToken
};