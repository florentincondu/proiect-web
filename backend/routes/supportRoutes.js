const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const supportController = require('../controllers/supportController');
const SystemLog = require('../models/SystemLog');

// Public route for contact form submissions (no authentication required)
router.post('/contact', supportController.createContactSubmission);

// Admin routes for contact submissions
router.get('/admin/contact-submissions', protect, admin, supportController.getContactSubmissions);
router.get('/admin/contact-submissions/:id', protect, admin, supportController.getSingleContactSubmission);
router.post('/admin/contact-submissions/:id/respond', protect, admin, supportController.respondToContactSubmission);

// Protected routes
router.post('/tickets', protect, supportController.createTicket);
router.get('/tickets/:id', protect, supportController.getTicketById);
router.get('/tickets', protect, supportController.getUserTickets);


router.get('/admin/tickets', protect, admin, supportController.getAllTickets);
router.get('/admin/support-tickets', protect, admin, supportController.getAllTickets);
router.patch('/admin/tickets/:id/status', protect, admin, supportController.updateTicketStatus);
router.post('/admin/tickets/:id/archive', protect, admin, supportController.archiveTicket);
router.get('/admin/ticket-stats', protect, admin, supportController.getTicketStats);


router.post('/tickets/:id/messages', protect, supportController.addMessageToTicket);


router.get('/admin/system-logs', protect, admin, supportController.getSystemLogs);


router.post('/admin/maintenance-mode', protect, admin, supportController.toggleMaintenanceMode);
router.get('/admin/maintenance-status', protect, admin, supportController.getMaintenanceStatus);
router.post('/admin/maintenance-customization', protect, admin, supportController.saveMaintenanceCustomization);
router.get('/maintenance-status', supportController.getPublicMaintenanceStatus);

module.exports = router;