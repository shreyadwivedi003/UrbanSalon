const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const authMiddleware = require('../../middlewares/auth');

// Protected pipeline: users must be logged in to pull curated smart recommendations
router.get('/recommendations', authMiddleware, aiController.getAIRecommendations);

module.exports = router;