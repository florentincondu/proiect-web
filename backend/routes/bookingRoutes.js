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



router.post('/hotel', protect, createHotelBooking);


router.get('/my-bookings', protect, getUserBookings);


router.put('/cancel/:id', protect, cancelBooking);



router.get('/', protect, admin, getBookings);


router.get('/:id', protect, admin, getBookingById);


router.put('/:id', protect, admin, updateBooking);


router.put('/:id/payment-status', protect, admin, updateBookingPaymentStatus);


router.delete('/:id', protect, admin, deleteBooking);


router.get('/stats/overview', protect, admin, getBookingStats);

module.exports = router;

 