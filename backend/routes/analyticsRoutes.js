const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

// All analytics routes are protected and require admin access
router.use(protect, admin);

// Get booking analytics
router.get('/bookings', analyticsController.getBookingAnalytics);

// Get revenue analytics
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Get location analytics
router.get('/locations', analyticsController.getLocationAnalytics);

// Get user analytics
router.get('/users', analyticsController.getUserAnalytics);

// Get system metrics
router.get('/system', analyticsController.getSystemMetrics);

// Get dashboard summary data
router.get('/dashboard', analyticsController.getDashboardSummary);

// Generate custom reports
router.post('/reports', analyticsController.getCustomReport);

// Export analytics data
router.get('/export', analyticsController.exportAnalytics);

module.exports = router; 