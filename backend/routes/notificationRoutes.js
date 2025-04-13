const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUserNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  generateTestNotification
} = require('../controllers/notificationController');

// User routes (require authentication)
router.get('/', protect, getUserNotifications);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.post('/test', protect, generateTestNotification);

// Admin routes (require admin role)
router.post('/', protect, admin, createNotification);

module.exports = router; 