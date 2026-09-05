const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Unified Single Login Page Endpoint (Open to all)
router.post('/login', authController.login);

// Current User Profile (Authenticated)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
