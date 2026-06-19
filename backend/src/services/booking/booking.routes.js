const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const authMiddleware = require('../../middlewares/auth');

// Public Search Endpoint: Anyone can check slot availability on a given day
router.get('/slots', bookingController.getAvailableSlots);

// Protected Checkout Pipeline: Users must be logged in to claim a spot
router.post('/checkout', authMiddleware, bookingController.createBooking);

module.exports = router;