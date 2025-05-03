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
  changePassword,
  logout
} = require('../controllers/authController.js');
const { protect, admin } = require('../middleware/authMiddleware');
const profileRoutes = require('./profileRoutes');


router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/verify-admin', verifyAdmin);
router.post('/resend-admin-verification', resendAdminVerification);
router.post('/change-subscription', protect, changeSubscription);
router.post('/reset-password', resetPassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-with-token', resetPasswordWithToken);
router.post('/change-password', protect, changePassword);


if (process.env.NODE_ENV !== 'production') {
  router.post('/test-email', testEmail);
}


router.use('/', profileRoutes);


router.get('/profile', protect, getProfile);

module.exports = router;