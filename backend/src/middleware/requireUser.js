const { cookieName, verifyUserToken } = require('../utils/userSession');

module.exports = (req, res, next) => {
  try {
    const token = req.cookies?.[cookieName];

    if (!token) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const payload = verifyUserToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired user session' });
  }
};