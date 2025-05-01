const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { protect, authorize, admin } = require('../middleware/authMiddleware');
const { hotelImagesUpload } = require('../middleware/uploadMiddleware');


router.use((req, res, next) => {
  console.log(`HotelRoutes: ${req.method} ${req.originalUrl}`);
  next();
});


router.get('/', hotelController.getHotels);
router.get('/search', hotelController.searchHotels);
router.get('/:id', hotelController.getHotel);
router.post('/check-availability', hotelController.checkAvailability);


router.use(protect);


router.post('/payment', hotelController.processHotelPayment);


router.get('/user/my-hotels', hotelController.getUserHotels);


router.post('/user-hotel', hotelController.createUserHotel);


router.post('/upload-images', hotelImagesUpload, hotelController.uploadHotelImages);


router.route('/')
  .post(authorize(['admin']), hotelController.createHotel);

router.route('/:id')
  .put(authorize(['admin']), hotelController.updateHotel)
  .delete(authorize(['admin']), hotelController.deleteHotel);


router.patch('/:id/price', authorize(['admin']), hotelController.updateHotelPrice);
router.patch('/:id/room-prices', authorize(['admin']), hotelController.updateRoomPrices);
router.patch('/prices', authorize(['admin']), hotelController.batchUpdatePrices);

router.put('/:id/restrict', authorize(['admin']), hotelController.toggleHotelRestriction);

module.exports = router; 