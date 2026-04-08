const express = require('express');
const userController = require('../controllers/userController');
const requireUser = require('../middleware/requireUser');

const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/google', userController.googleSignIn);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/logout', userController.logout);
router.get('/me', requireUser, userController.me);
router.put('/profile', requireUser, userController.updateProfile);
router.get('/profile/:userId', userController.getUserProfile);

module.exports = router;