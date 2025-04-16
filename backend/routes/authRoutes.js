const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  verifyAdmin, 
  changeSubscription, 
  testEmail, 
  resendAdminVerification,
  getProfile,
  resetPassword,
  forgotPassword,
  resetPasswordWithToken,
  changePassword
} = require('../controllers/authController.js');
const { protect, admin } = require('../middleware/authMiddleware');
const profileRoutes = require('./profileRoutes');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-admin', verifyAdmin);
router.post('/resend-admin-verification', resendAdminVerification);
router.post('/change-subscription', protect, changeSubscription);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-with-token', resetPasswordWithToken);
router.post('/change-password', protect, changePassword);

// Test route - only for development
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-email', testEmail);
}

// Use profile routes
router.use('/', profileRoutes);

// Protected routes
router.get('/profile', protect, getProfile);

module.exports = router;