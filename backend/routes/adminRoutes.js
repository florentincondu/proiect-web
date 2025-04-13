const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const adminController = require('../controllers/adminController');
const Hotel = require('../models/Hotel');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const {
  getRecentActiveUsers,
  getUserActivityDetails,
  getUserActivityStats
} = require('../controllers/userActivityController');

// Dashboard endpoints
router.get('/dashboard/summary', protect, admin, adminController.getDashboardSummary);
router.get('/logs/recent', protect, admin, adminController.getRecentLogs);
router.post('/logs', protect, admin, adminController.createLogEntry);

// Hotel management routes for admin
router.get('/hotels', protect, admin, adminController.getHotelsForAdmin);

// Places API hotel management routes (Google Places integration)
// These specific routes need to come BEFORE the dynamic :id route
router.get('/places/prices', protect, admin, adminController.getPlacesPrices);

// Dynamic route for individual hotels - must come AFTER specific routes
router.get('/hotels/:id', protect, admin, adminController.getHotelById);
router.put('/hotels/:id/update-price', protect, admin, adminController.updateHotelPrice);
router.put('/hotels/:id/restrict', protect, admin, adminController.updateHotelRestrictions);
router.post('/hotels/update-place-price', protect, admin, adminController.updatePlacePrice);
router.post('/hotels/update-place-restriction', protect, admin, adminController.updatePlaceRestriction);

// USER MANAGEMENT ROUTES
router.route('/users').get(protect, admin, getAllUsers);
router.route('/users/:id').get(protect, admin, getUserById);
router.route('/users/:id').put(protect, admin, updateUser);
router.route('/users/:id').delete(protect, admin, deleteUser);

// USER ACTIVITY ROUTES
router.get('/users/activity/recent', protect, admin, getRecentActiveUsers);
router.get('/users/:id/activity', protect, admin, getUserActivityDetails);
router.get('/users/stats/activity', protect, admin, getUserActivityStats);

// Get user statistics (admin only)
router.get('/statistics', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalHosts = await User.countDocuments({ role: 'host' });

    res.json({
      totalUsers,
      totalAdmins,
      totalClients,
      totalHosts,
      usersByRole: {
        admin: totalAdmins,
        client: totalClients,
        host: totalHosts
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 