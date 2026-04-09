const express = require('express');
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const { adminLogin } = require('../validators/auth');

const router = express.Router();

router.post('/login', adminLogin, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/status', requireAdmin, authController.status);

module.exports = router;