const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');


router.get('/', protect, admin, getServices);


router.get('/:id', protect, admin, getServiceById);


router.post('/', protect, admin, createService);


router.put('/:id', protect, admin, updateService);


router.delete('/:id', protect, admin, deleteService);

module.exports = router; 