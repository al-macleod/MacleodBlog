const express = require('express');
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/status', requireAdmin, authController.status);

module.exports = router;