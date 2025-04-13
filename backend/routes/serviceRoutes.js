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

// Get all services (admin only)
router.get('/', protect, admin, getServices);

// Get service by ID (admin only)
router.get('/:id', protect, admin, getServiceById);

// Create service (admin only)
router.post('/', protect, admin, createService);

// Update service (admin only)
router.put('/:id', protect, admin, updateService);

// Delete service (admin only)
router.delete('/:id', protect, admin, deleteService);

module.exports = router; 