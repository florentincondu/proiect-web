const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const supportController = require('../controllers/supportController');
const SystemLog = require('../models/SystemLog');


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

module.exports = router;