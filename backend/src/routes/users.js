const express = require('express');
const userController = require('../controllers/userController');
const requireUser = require('../middleware/requireUser');
const validate = require('../middleware/validate');
const { register, login, forgotPassword, resetPassword, updateProfile, googleSignIn } = require('../validators/users');

const router = express.Router();

router.post('/register', register, validate, userController.register);
router.post('/login', login, validate, userController.login);
router.post('/google', googleSignIn, validate, userController.googleSignIn);
router.post('/forgot-password', forgotPassword, validate, userController.forgotPassword);
router.post('/reset-password', resetPassword, validate, userController.resetPassword);
router.post('/logout', userController.logout);
router.get('/me', requireUser, userController.me);
router.put('/profile', requireUser, updateProfile, validate, userController.updateProfile);
router.get('/profile/:userId', userController.getUserProfile);

module.exports = router;