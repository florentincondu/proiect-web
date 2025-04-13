const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getBookingStats,
  createHotelBooking,
  getUserBookings,
  cancelBooking,
  updateBookingPaymentStatus
} = require('../controllers/bookingController');

// User routes
// Create a new hotel booking
router.post('/hotel', protect, createHotelBooking);

// Get user's bookings (active or past)
router.get('/my-bookings', protect, getUserBookings);

// Cancel a booking
router.put('/cancel/:id', protect, cancelBooking);

// Admin routes
// Get all bookings (admin only)
router.get('/', protect, admin, getBookings);

// Get booking by ID (admin only)
router.get('/:id', protect, admin, getBookingById);

// Update booking (admin only)
router.put('/:id', protect, admin, updateBooking);

// Update booking payment status (admin only)
router.put('/:id/payment-status', protect, admin, updateBookingPaymentStatus);

// Delete booking (admin only)
router.delete('/:id', protect, admin, deleteBooking);

// Get booking statistics (admin only)
router.get('/stats/overview', protect, admin, getBookingStats);

module.exports = router;

 