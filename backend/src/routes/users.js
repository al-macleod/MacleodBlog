const express = require('express');
const userController = require('../controllers/userController');
const requireUser = require('../middleware/requireUser');
const { passport } = require('../utils/passport');

const router = express.Router();

// Local auth
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.post('/refresh', userController.refreshTokens);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// User profile
router.get('/me', requireUser, userController.me);
router.put('/profile', requireUser, userController.updateProfile);
router.get('/profile/:userId', userController.getUserProfile);

// Google OAuth
router.get('/auth/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);
router.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/account?error=google_failed` }),
  userController.oauthCallback('google')
);

// GitHub OAuth
router.get('/auth/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] })
);
router.get('/auth/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/account?error=github_failed` }),
  userController.oauthCallback('github')
);

module.exports = router;
