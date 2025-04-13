const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { protect, authorize, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', hotelController.getHotels);
router.get('/search', hotelController.searchHotels);
router.get('/:id', hotelController.getHotel);
router.post('/check-availability', hotelController.checkAvailability);

// Protected routes - require authentication
router.use(protect);

// Regular user and admin routes
router.route('/')
  .post(authorize(['admin']), hotelController.createHotel);

router.route('/:id')
  .put(authorize(['admin']), hotelController.updateHotel)
  .delete(authorize(['admin']), hotelController.deleteHotel);

// Price management routes
router.patch('/:id/price', authorize(['admin']), hotelController.updateHotelPrice);
router.patch('/:id/room-prices', authorize(['admin']), hotelController.updateRoomPrices);
router.patch('/prices', authorize(['admin']), hotelController.batchUpdatePrices);

module.exports = router; 