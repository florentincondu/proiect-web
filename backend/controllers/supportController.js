const SupportTicket = require('../models/SupportTicket');
const SystemLog = require('../models/SystemLog');
const Setting = require('../models/Setting');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { createSupportResponseNotification } = require('./notificationController');

// Mock support tickets data
const supportTickets = [
  {
    _id: '1',
    subject: 'Booking cancellation issue',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    user: {
      _id: '101',
      name: 'John Smith',
      email: 'john@example.com'
    },
    messages: [
      {
        _id: '1a',
        text: 'I need help cancelling my booking #1234',
        sender: 'user',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]
  },
  {
    _id: '2',
    subject: 'Payment not processed',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    user: {
      _id: '102',
      name: 'Sarah Johnson',
      email: 'sarah@example.com'
    },
    messages: [
      {
        _id: '2a',
        text: 'My payment was deducted but booking not confirmed',
        sender: 'user',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        _id: '2b',
        text: 'We are looking into this issue',
        sender: 'admin',
        createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000)
      }
    ]
  }
];

// Get all support tickets (admin only)
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 10 } = req.query;
    
    console.log('Support tickets requested with filters:', { status, priority, category, page, limit });
    
    // Build query for filtering
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch tickets from database with filtering and pagination
    const tickets = await SupportTicket.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await SupportTicket.countDocuments(query);
    
    console.log('Found tickets in database:', tickets.length);
    
    // If no tickets found in the database, return an empty array
    if (tickets.length === 0) {
      return res.json({
        tickets: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        }
      });
    }
    
    // Format tickets for response
    const formattedTickets = tickets.map(ticket => ({
      _id: ticket._id,
      subject: ticket.title || ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      user: {
        _id: ticket.userId?._id || 'unknown',
        firstName: ticket.userId?.firstName || 'Unknown',
        lastName: ticket.userId?.lastName || 'User',
        email: ticket.userId?.email || 'unknown@example.com'
      },
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages || []
    }));
    
    console.log('Returning real support tickets, count:', formattedTickets.length);
    
    // Return real tickets with pagination
    res.json({
      tickets: formattedTickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
};

// Get all user tickets
exports.getUserTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;
    
    console.log('User tickets requested for user ID:', userId);
    
    // Build query for filtering
    const query = { userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch tickets from database
    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await SupportTicket.countDocuments(query);
    
    console.log('Found user tickets in database:', tickets.length);
    
    // Format tickets for response
    const formattedTickets = tickets.map(ticket => ({
      _id: ticket._id,
      subject: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastActivity: ticket.lastActivity,
      messages: ticket.messages || []
    }));
    
    res.json({
      tickets: formattedTickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    SystemLog.logError('Error fetching user tickets', 'supportController', { 
      error: error.message,
      userId: req.user._id
    });
    res.status(500).json({ message: 'Failed to fetch user tickets' });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Support ticket requested by ID:', id);
    
    // Fetch ticket from database 
    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email role')
      .lean();
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check if user is authorized to view this ticket
    if (!req.user.isAdmin && ticket.userId._id.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized ticket access attempt', 'supportController', {
        ticketId: id,
        userId: req.user._id
      });
      return res.status(403).json({ message: 'You are not authorized to view this ticket' });
    }
    
    // Format ticket for response
    const formattedTicket = {
      _id: ticket._id,
      subject: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      user: {
        _id: ticket.userId?._id || 'unknown',
        firstName: ticket.userId?.firstName || 'Unknown',
        lastName: ticket.userId?.lastName || 'User',
        email: ticket.userId?.email || 'unknown@example.com'
      },
      assignedTo: ticket.assignedTo ? {
        _id: ticket.assignedTo._id,
        firstName: ticket.assignedTo.firstName,
        lastName: ticket.assignedTo.lastName,
        email: ticket.assignedTo.email,
        role: ticket.assignedTo.role
      } : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastActivity: ticket.lastActivity,
      messages: ticket.messages || [],
      attachments: ticket.attachments || [],
      isArchived: ticket.isArchived
    };
    
    console.log('Ticket found:', ticket._id);
    res.json(formattedTicket);
  } catch (error) {
    console.error(`Error fetching ticket with ID ${req.params.id}:`, error);
    SystemLog.logError('Error fetching ticket', 'supportController', { 
      error: error.message,
      ticketId: req.params.id
    });
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
};

// Create a new support ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority = 'medium', attachments = [] } = req.body;
    
    // Check for required fields
    if (!subject || !description || !category) {
      return res.status(400).json({ message: 'Subject, description, and category are required' });
    }
    
    console.log('Support ticket creation requested:', { subject, category, priority });
    
    // Create initial message from description
    const initialMessage = {
      sender: req.user._id,
      senderRole: 'user',
      content: description,
      readBy: [req.user._id]
    };
    
    // Create new ticket in database
    const newTicket = await SupportTicket.create({
      title: subject,
      description,
      userId: req.user._id,
      category,
      priority,
      status: 'open',
      messages: [initialMessage],
      attachments
    });
    
    // Log ticket creation
    SystemLog.logInfo('Support ticket created', 'supportController', {
      ticketId: newTicket._id,
      userId: req.user._id,
      category,
      priority
    });
    
    console.log('Created new support ticket with ID:', newTicket._id);
    
    // Format ticket for response
    const formattedTicket = {
      _id: newTicket._id,
      subject: newTicket.title,
      description: newTicket.description,
      status: newTicket.status,
      priority: newTicket.priority,
      category: newTicket.category,
      user: {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email
      },
      createdAt: newTicket.createdAt,
      messages: newTicket.messages
    };
    
    res.status(201).json(formattedTicket);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    SystemLog.logError('Error creating support ticket', 'supportController', { 
      error: error.message,
      userId: req.user?._id
    });
    res.status(500).json({ message: 'Failed to create support ticket' });
  }
};

// Update ticket status (admin only)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    
    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (open, in_progress, resolved, closed) is required' });
    }
    
    console.log('Support ticket status update requested for ID:', id, 'New status:', status);
    
    // Find the ticket in database
    const ticket = await SupportTicket.findById(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Update ticket status
    ticket.status = status;
    
    // Add system message about status change
    ticket.messages.push({
      sender: req.user._id,
      senderRole: 'system',
      content: `Ticket status changed to ${status} by ${req.user.firstName} ${req.user.lastName}`
    });
    
    // Update assignedTo if provided
    if (assignedTo) {
      // If assigning to a different admin
      if (!ticket.assignedTo || ticket.assignedTo.toString() !== assignedTo) {
        ticket.assignedTo = assignedTo;
        
        // Add system message about assignment
        ticket.messages.push({
          sender: req.user._id,
          senderRole: 'system',
          content: `Ticket assigned to a new agent by ${req.user.firstName} ${req.user.lastName}`
        });
      }
    }
    
    // Save the updated ticket
    await ticket.save();
    
    // Log ticket status update
    SystemLog.logInfo(`Support ticket status updated to ${status}`, 'supportController', {
      ticketId: ticket._id,
      previousStatus: ticket.status,
      newStatus: status,
      updatedBy: req.user._id
    });
    
    console.log('Updated ticket status for ID:', id);
    res.json({
      message: 'Ticket status updated successfully',
      updatedTicket: {
        _id: ticket._id,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (error) {
    console.error(`Error updating ticket status for ID ${req.params.id}:`, error);
    SystemLog.logError('Error updating ticket status', 'supportController', { 
      error: error.message,
      ticketId: req.params.id
    });
    res.status(500).json({ message: 'Failed to update ticket status' });
  }
};

// Archive ticket
exports.archiveTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    ticket.isArchived = true;
    await ticket.save();
    
    // Log ticket archival
    SystemLog.logInfo('Support ticket archived', 'supportController', {
      ticketId: ticket._id,
      archivedBy: req.user._id
    });
    
    res.json({ message: 'Ticket archived successfully' });
  } catch (error) {
    console.error('Error archiving ticket:', error);
    SystemLog.logError('Error archiving ticket', 'supportController', { 
      error: error.message,
      ticketId: req.params.id
    });
    res.status(500).json({ message: 'Failed to archive ticket' });
  }
};

// Get ticket statistics (admin only)
exports.getTicketStats = async (req, res) => {
  try {
    console.log('Ticket statistics requested');
    
    // Get tickets by status
    const byStatus = await SupportTicket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Get tickets by priority
    const byPriority = await SupportTicket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Get tickets by category
    const byCategory = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Calculate response times
    const responseTimeStats = await SupportTicket.aggregate([
      // Filter only tickets with messages
      { $match: { 'messages.1': { $exists: true } } },
      // Unwind the messages array
      { $unwind: '$messages' },
      // Group by ticket ID
      {
        $group: {
          _id: '$_id',
          firstMessageTime: { $min: '$messages.createdAt' },
          responseTime: { $min: { $cond: [
            { $eq: ['$messages.senderRole', 'admin'] },
            '$messages.createdAt',
            null
          ] } }
        }
      },
      // Filter only tickets with admin responses
      { $match: { responseTime: { $ne: null } } },
      // Calculate response time in hours
      {
        $project: {
          responseTimeHours: {
            $divide: [
              { $subtract: ['$responseTime', '$firstMessageTime'] },
              3600000 // Convert ms to hours
            ]
          }
        }
      },
      // Calculate statistics
      {
        $group: {
          _id: null,
          average: { $avg: '$responseTimeHours' },
          fastest: { $min: '$responseTimeHours' },
          slowest: { $max: '$responseTimeHours' }
        }
      }
    ]);
    
    // Get tickets created/closed over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Group tickets by month
    const ticketsOverTime = await SupportTicket.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $project: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          status: 1
        }
      },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          opened: { $sum: 1 },
          closed: { 
            $sum: {
              $cond: [
                { $eq: ['$status', 'closed'] },
                1,
                0
              ]
            } 
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $concat: [
              { $toString: '$_id.year' }, '-',
              { $toString: '$_id.month' }, '-01'
            ]
          },
          opened: 1,
          closed: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Calculate additional metrics
    const totalTickets = await SupportTicket.countDocuments();
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });
    const closedTickets = await SupportTicket.countDocuments({ status: 'closed' });
    const resolutionRate = totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0;
    
    const responseTimeData = responseTimeStats.length > 0 ? responseTimeStats[0] : {
      average: 0,
      fastest: 0,
      slowest: 0
    };
    
    // Compile statistics
    const stats = {
      byStatus,
      byPriority,
      byCategory,
      responseTime: {
        average: parseFloat(responseTimeData.average?.toFixed(1)) || 0,
        fastest: parseFloat(responseTimeData.fastest?.toFixed(1)) || 0,
        slowest: parseFloat(responseTimeData.slowest?.toFixed(1)) || 0
      },
      ticketsOverTime,
      summary: {
        total: totalTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
        resolutionRate: parseFloat(resolutionRate.toFixed(1))
      }
    };
    
    console.log('Returning ticket statistics');
    res.json(stats);
  } catch (error) {
    console.error('Error fetching ticket statistics:', error);
    SystemLog.logError('Error fetching ticket statistics', 'supportController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch ticket statistics' });
  }
};

// Get system logs (admin only)
exports.getSystemLogs = async (req, res) => {
  try {
    const { level, module, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    console.log('System logs requested with filters:', { level, module, startDate, endDate, page, limit });
    
    // Mock logs data
    const mockLogs = Array.from({ length: 50 }, (_, i) => ({
      _id: (50 - i).toString(),
      level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)],
      message: `System log entry #${50 - i}`,
      module: ['auth', 'booking', 'payment', 'user', 'hotel'][Math.floor(Math.random() * 5)],
      timestamp: new Date(Date.now() - (i * 4) * 60 * 60 * 1000),
      details: { ip: '192.168.1.1', browser: 'Chrome', os: 'Windows' }
    }));
    
    // Apply filters (simple mock filtering)
    let filteredLogs = [...mockLogs];
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (module) {
      filteredLogs = filteredLogs.filter(log => log.module === module);
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= start && log.timestamp <= end
      );
    }
    
    // Mock pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    console.log('Returning mock system logs, count:', paginatedLogs.length);
    
    // Return mock paginated results
    res.json({
      logs: paginatedLogs,
      pagination: {
        total: filteredLogs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredLogs.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Failed to fetch system logs' });
  }
};

// Check system maintenance status
exports.getMaintenanceStatus = async (req, res) => {
  try {
    console.log('Maintenance status requested');
    
    // Try to get maintenance mode setting from database
    let maintenanceMode = false;
    
    try {
      const setting = await Setting.findOne({ key: 'system.maintenanceMode' });
      if (setting) {
        maintenanceMode = setting.value === true;
      }
    } catch (dbError) {
      console.error('Error fetching maintenance mode from database:', dbError);
      // Continue with default false value
    }
    
    // Simple response format matching what frontend expects
    const maintenanceStatus = {
      maintenanceMode: maintenanceMode
    };
    
    console.log('Returning maintenance status:', maintenanceStatus);
    res.json(maintenanceStatus);
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({ message: 'Failed to fetch maintenance status' });
  }
};

// Toggle maintenance mode
exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Update maintenance mode setting
    await Setting.setSetting('system.maintenanceMode', enabled, {
      group: 'system',
      description: 'Maintenance mode status',
      isPublic: true, // So clients can check it
      lastUpdatedBy: req.user._id
    });
    
    // Log maintenance mode change
    SystemLog.logInfo(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 'supportController', {
      userId: req.user._id
    });
    
    res.json({ 
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenanceMode: enabled
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    SystemLog.logError('Error toggling maintenance mode', 'supportController', { error: error.message });
    res.status(500).json({ message: 'Failed to toggle maintenance mode' });
  }
};

// Add message to ticket
exports.addMessageToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments = [] } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    console.log('Message being added to ticket ID:', id);
    
    // Find the ticket
    const ticket = await SupportTicket.findById(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check authorization - only ticket owner or admin can add messages
    if (!req.user.isAdmin && ticket.userId.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized message add attempt', 'supportController', {
        ticketId: id,
        userId: req.user._id
      });
      return res.status(403).json({ message: 'You are not authorized to add messages to this ticket' });
    }
    
    // Create the new message
    const newMessage = {
      sender: req.user._id,
      senderRole: req.user.isAdmin ? 'admin' : 'user',
      content,
      attachments
    };
    
    // Add message to ticket
    ticket.messages.push(newMessage);
    
    // If ticket was closed and user adds a message, reopen it
    if (ticket.status === 'closed' && !req.user.isAdmin) {
      ticket.status = 'open';
      
      // Add system message
      ticket.messages.push({
        sender: req.user._id,
        senderRole: 'system',
        content: 'Ticket reopened due to new user message'
      });
    }
    
    // Update lastActivity
    ticket.lastActivity = Date.now();
    
    // Save the ticket with new message
    await ticket.save();
    
    console.log('Added message to ticket ID:', id);
    
    // For message formatters and notifications
    const messageIndex = ticket.messages.length - 1;
    const addedMessage = ticket.messages[messageIndex];
    
    // If message is from admin to user, create notification for the user
    if (req.user.isAdmin || req.user.role === 'admin') {
      try {
        // Get the user who owns the ticket
        const ticketUser = await User.findById(ticket.userId);
        if (ticketUser) {
          // Create notification
          await createSupportResponseNotification(ticket, ticketUser);
          console.log('Support response notification created for user:', ticketUser._id);
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Continue even if notification creation fails
      }
    }
    
    // If message is from user to admin, update status to in_progress if it's open
    if (!req.user.isAdmin && ticket.status === 'open' && ticket.assignedTo) {
      ticket.status = 'in_progress';
      await ticket.save();
    }
    
    res.json({
      message: 'Message added successfully',
      ticketId: id,
      newMessage: addedMessage
    });
  } catch (error) {
    console.error(`Error adding message to ticket with ID ${req.params.id}:`, error);
    SystemLog.logError('Error adding message to ticket', 'supportController', { 
      error: error.message,
      ticketId: req.params.id
    });
    res.status(500).json({ message: 'Failed to add message to ticket' });
  }
}; 