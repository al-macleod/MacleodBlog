const {
  cookieName,
  verifyAdminToken
} = require('../utils/adminAuth');

module.exports = (req, res, next) => {
  try {
    const token = req.cookies?.[cookieName];

    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const payload = verifyAdminToken(token);

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access denied' });
    }

    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
};