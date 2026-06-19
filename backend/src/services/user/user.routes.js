const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authMiddleware = require('../../middlewares/auth');

// Public Route: Exposes authorization creation routes
router.post('/oauth-login', userController.handleOAuthLogin);

// Protected Routes: Requires verified authorization header attachment values
router.get('/me', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateStyleProfile);

module.exports = router;