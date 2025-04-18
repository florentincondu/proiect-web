const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');


router.use(protect, admin);


router.get('/bookings', analyticsController.getBookingAnalytics);


router.get('/revenue', analyticsController.getRevenueAnalytics);


router.get('/locations', analyticsController.getLocationAnalytics);


router.get('/users', analyticsController.getUserAnalytics);


router.get('/system', analyticsController.getSystemMetrics);


router.get('/dashboard', analyticsController.getDashboardSummary);


router.post('/reports', analyticsController.getCustomReport);


router.get('/export', analyticsController.exportAnalytics);

module.exports = router; 