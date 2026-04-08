const {
  cookieName,
  getCookieOptions,
  getClearCookieOptions,
  validateAdminCredentials,
  createAdminToken
} = require('../utils/adminAuth');

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!validateAdminCredentials(username, password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = createAdminToken();
  res.cookie(cookieName, token, getCookieOptions());

  return res.json({ authenticated: true, username });
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName, getClearCookieOptions());
  return res.json({ authenticated: false });
};

exports.status = (req, res) => {
  return res.json({
    authenticated: true,
    username: process.env.ADMIN_USERNAME
  });
};