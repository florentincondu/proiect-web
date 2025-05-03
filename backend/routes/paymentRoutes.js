const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');


router.get('/payments/public-stats', paymentController.getPublicStats);


router.get('/payments/user', protect, paymentController.getUserPayments);
router.get('/payments/user/:id', protect, paymentController.getUserPaymentById);
router.post('/payments/process', protect, paymentController.processPayment);
router.get('/payments/booking/:bookingId', protect, paymentController.getPaymentsForBooking);


router.get('/payments', protect, admin, paymentController.getAllPayments);
router.get('/payments/stats', protect, admin, paymentController.getPaymentStats);
router.get('/payments/recent-summary', protect, admin, paymentController.getRecentPaymentsSummary);
router.get('/payments/:id', protect, admin, paymentController.getPaymentById);
router.post('/payments', protect, admin, paymentController.createPayment);
router.put('/payments/:id/status', protect, admin, paymentController.updatePaymentStatus);
router.post('/refund', protect, admin, paymentController.processRefund);
router.get('/payments/:id/invoice', protect, paymentController.generateInvoice);
router.get('/payments/:id/invoice-pdf', protect, paymentController.generateInvoicePdf);

module.exports = router; 