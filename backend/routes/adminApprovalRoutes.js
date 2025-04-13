const express = require('express');
const router = express.Router();
const adminApprovalController = require('../controllers/adminApprovalController');

// Request admin access
router.post('/request', adminApprovalController.requestAdminAccess);

// Approve admin request
router.get('/approve', adminApprovalController.approveAdminRequest);

// Reject admin request
router.get('/reject', adminApprovalController.rejectAdminRequest);

// Special approval/rejection routes for email-based links
router.get('/approve-admin-request', adminApprovalController.approveAdminRequest);
router.get('/reject-admin-request', adminApprovalController.rejectAdminRequest);

// Verify admin code route (used by user after receiving code)
router.post('/verify-code', adminApprovalController.verifyAdminCode);

// Resend verification code
router.post('/resend-code', adminApprovalController.resendVerificationCode);

// Get verification status
router.get('/status', adminApprovalController.getAdminVerificationStatus);

module.exports = router; 