const express = require('express');
const router = express.Router();
const adminApprovalController = require('../controllers/adminApprovalController');


router.post('/request', adminApprovalController.requestAdminAccess);


router.get('/approve', adminApprovalController.approveAdminRequest);


router.get('/reject', adminApprovalController.rejectAdminRequest);


router.get('/approve-admin-request', adminApprovalController.approveAdminRequest);
router.get('/reject-admin-request', adminApprovalController.rejectAdminRequest);


router.post('/verify-code', adminApprovalController.verifyAdminCode);


router.post('/resend-code', adminApprovalController.resendVerificationCode);


router.get('/status', adminApprovalController.getAdminVerificationStatus);

module.exports = router; 