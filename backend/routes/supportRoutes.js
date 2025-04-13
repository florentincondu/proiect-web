const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const supportController = require('../controllers/supportController');
const SystemLog = require('../models/SystemLog');

// Public routes
router.post('/tickets', protect, supportController.createTicket);
router.get('/tickets/:id', protect, supportController.getTicketById);
router.get('/tickets', protect, supportController.getUserTickets);

// Admin routes
router.get('/admin/tickets', protect, admin, supportController.getAllTickets);
router.get('/admin/support-tickets', protect, admin, supportController.getAllTickets);
router.patch('/admin/tickets/:id/status', protect, admin, supportController.updateTicketStatus);
router.post('/admin/tickets/:id/archive', protect, admin, supportController.archiveTicket);
router.get('/admin/ticket-stats', protect, admin, supportController.getTicketStats);

// Add message to ticket
router.post('/tickets/:id/messages', protect, supportController.addMessageToTicket);

// System logs for admins
router.get('/admin/system-logs', protect, admin, supportController.getSystemLogs);

// Maintenance mode toggle and status (admin only)
router.post('/admin/maintenance-mode', protect, admin, supportController.toggleMaintenanceMode);
router.get('/admin/maintenance-status', protect, admin, supportController.getMaintenanceStatus);

module.exports = router;