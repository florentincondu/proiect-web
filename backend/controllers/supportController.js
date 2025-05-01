const { SupportTicket, ContactSubmission } = require('../models/SupportTicket');
const SystemLog = require('../models/SystemLog');
const Setting = require('../models/Setting');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { createSupportResponseNotification, createContactResponseNotification } = require('./notificationController');
const { sendEmail } = require('../utils/emailSender');


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


exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 10 } = req.query;
    
    console.log('Support tickets requested with filters:', { status, priority, category, page, limit });
    

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
    

    const skip = (parseInt(page) - 1) * parseInt(limit);
    

    const tickets = await SupportTicket.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    

    const total = await SupportTicket.countDocuments(query);
    
    console.log('Found tickets in database:', tickets.length);
    

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


exports.getUserTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;
    
    console.log('User tickets requested for user ID:', userId);
    

    const query = { userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    

    const skip = (parseInt(page) - 1) * parseInt(limit);
    

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    

    const total = await SupportTicket.countDocuments(query);
    
    console.log('Found user tickets in database:', tickets.length);
    

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


exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Support ticket requested by ID:', id);
    

    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email role')
      .lean();
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    

    if (!req.user.isAdmin && ticket.userId._id.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized ticket access attempt', 'supportController', {
        ticketId: id,
        userId: req.user._id
      });
      return res.status(403).json({ message: 'You are not authorized to view this ticket' });
    }
    

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


exports.createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority = 'medium', attachments = [] } = req.body;
    

    if (!subject || !description || !category) {
      return res.status(400).json({ message: 'Subject, description, and category are required' });
    }
    
    console.log('Support ticket creation requested:', { subject, category, priority });
    

    const initialMessage = {
      sender: req.user._id,
      senderRole: 'user',
      content: description,
      readBy: [req.user._id]
    };
    

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
    

    SystemLog.logInfo('Support ticket created', 'supportController', {
      ticketId: newTicket._id,
      userId: req.user._id,
      category,
      priority
    });
    
    console.log('Created new support ticket with ID:', newTicket._id);
    

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


exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    
    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (open, in_progress, resolved, closed) is required' });
    }
    
    console.log('Support ticket status update requested for ID:', id, 'New status:', status);
    

    const ticket = await SupportTicket.findById(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    

    ticket.status = status;
    

    ticket.messages.push({
      sender: req.user._id,
      senderRole: 'system',
      content: `Ticket status changed to ${status} by ${req.user.firstName} ${req.user.lastName}`
    });
    

    if (assignedTo) {

      if (!ticket.assignedTo || ticket.assignedTo.toString() !== assignedTo) {
        ticket.assignedTo = assignedTo;
        

        ticket.messages.push({
          sender: req.user._id,
          senderRole: 'system',
          content: `Ticket assigned to a new agent by ${req.user.firstName} ${req.user.lastName}`
        });
      }
    }
    

    await ticket.save();
    

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


exports.archiveTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    ticket.isArchived = true;
    await ticket.save();
    

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


exports.getTicketStats = async (req, res) => {
  try {
    console.log('Ticket statistics requested');
    

    const byStatus = await SupportTicket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    

    const byPriority = await SupportTicket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    

    const byCategory = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    

    const responseTimeStats = await SupportTicket.aggregate([

      { $match: { 'messages.1': { $exists: true } } },

      { $unwind: '$messages' },

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

      { $match: { responseTime: { $ne: null } } },

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

      {
        $group: {
          _id: null,
          average: { $avg: '$responseTimeHours' },
          fastest: { $min: '$responseTimeHours' },
          slowest: { $max: '$responseTimeHours' }
        }
      }
    ]);
    

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    

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
    

    const totalTickets = await SupportTicket.countDocuments();
    const resolvedTickets = await SupportTicket.countDocuments({ status: 'resolved' });
    const closedTickets = await SupportTicket.countDocuments({ status: 'closed' });
    const resolutionRate = totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0;
    
    const responseTimeData = responseTimeStats.length > 0 ? responseTimeStats[0] : {
      average: 0,
      fastest: 0,
      slowest: 0
    };
    

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


exports.getSystemLogs = async (req, res) => {
  try {
    const { level, module, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    console.log('System logs requested with filters:', { level, module, startDate, endDate, page, limit });
    

    const mockLogs = Array.from({ length: 50 }, (_, i) => ({
      _id: (50 - i).toString(),
      level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)],
      message: `System log entry #${50 - i}`,
      module: ['auth', 'booking', 'payment', 'user', 'hotel'][Math.floor(Math.random() * 5)],
      timestamp: new Date(Date.now() - (i * 4) * 60 * 60 * 1000),
      details: { ip: '192.168.1.1', browser: 'Chrome', os: 'Windows' }
    }));
    

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
    

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    console.log('Returning mock system logs, count:', paginatedLogs.length);
    

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


exports.getMaintenanceStatus = async (req, res) => {
  try {
    console.log('Maintenance status requested');
    
    // Get the maintenance mode status
    let maintenanceMode = false;
    try {
      const setting = await Setting.findOne({ key: 'system.maintenanceMode' });
      if (setting) {
        maintenanceMode = setting.value === true;
      }
    } catch (dbError) {
      console.error('Error fetching maintenance mode from database:', dbError);
    }
    
    // Get maintenance message and completion time
    let maintenanceMessage = '';
    let completionTime = null;
    
    try {
      const messageSetting = await Setting.findOne({ key: 'system.maintenanceMessage' });
      if (messageSetting) {
        maintenanceMessage = messageSetting.value;
      }
      
      const timeSetting = await Setting.findOne({ key: 'system.maintenanceCompletionTime' });
      if (timeSetting) {
        completionTime = timeSetting.value;
      }
    } catch (dbError) {
      console.error('Error fetching maintenance details from database:', dbError);
    }
    
    const maintenanceStatus = {
      maintenanceMode,
      message: maintenanceMessage,
      completionTime
    };
    
    console.log('Returning maintenance status:', maintenanceStatus);
    res.json(maintenanceStatus);
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({ message: 'Failed to fetch maintenance status' });
  }
};


exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled, maintenanceMessage, completionTime } = req.body;
    
    // Set the main maintenance mode
    await Setting.setSetting('system.maintenanceMode', enabled, {
      group: 'system',
      description: 'Maintenance mode status',
      isPublic: true, // So clients can check it
      lastUpdatedBy: req.user._id
    });
    
    // If maintenance message is provided, save it
    if (maintenanceMessage !== undefined) {
      await Setting.setSetting('system.maintenanceMessage', maintenanceMessage, {
        group: 'system',
        description: 'Maintenance mode message',
        isPublic: true,
        lastUpdatedBy: req.user._id
      });
    }
    
    // If completion time is provided, save it
    if (completionTime !== undefined) {
      await Setting.setSetting('system.maintenanceCompletionTime', completionTime, {
        group: 'system',
        description: 'Estimated maintenance completion time',
        isPublic: true,
        lastUpdatedBy: req.user._id
      });
    }
    
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


exports.addMessageToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments = [] } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    console.log('Message being added to ticket ID:', id);
    

    const ticket = await SupportTicket.findById(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    

    if (!req.user.isAdmin && ticket.userId.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized message add attempt', 'supportController', {
        ticketId: id,
        userId: req.user._id
      });
      return res.status(403).json({ message: 'You are not authorized to add messages to this ticket' });
    }
    

    const newMessage = {
      sender: req.user._id,
      senderRole: req.user.isAdmin ? 'admin' : 'user',
      content,
      attachments
    };
    

    ticket.messages.push(newMessage);
    

    if (ticket.status === 'closed' && !req.user.isAdmin) {
      ticket.status = 'open';
      

      ticket.messages.push({
        sender: req.user._id,
        senderRole: 'system',
        content: 'Ticket reopened due to new user message'
      });
    }
    

    ticket.lastActivity = Date.now();
    

    await ticket.save();
    
    console.log('Added message to ticket ID:', id);
    

    const messageIndex = ticket.messages.length - 1;
    const addedMessage = ticket.messages[messageIndex];
    

    if (req.user.isAdmin || req.user.role === 'admin') {
      try {

        const ticketUser = await User.findById(ticket.userId);
        if (ticketUser) {

          await createSupportResponseNotification(ticket, ticketUser);
          console.log('Support response notification created for user:', ticketUser._id);
        }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);

      }
    }
    

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


exports.createContactSubmission = async (req, res) => {
  try {
    const { name, email, subject, category, message, bookingId, isPrivacyAgreed } = req.body;
    
    // Validate required fields
    if (!name || !email || !subject || !message || !isPrivacyAgreed) {
      return res.status(400).json({ 
        success: false,
        message: 'Numele, email-ul, subiectul, mesajul și acordul de confidențialitate sunt obligatorii' 
      });
    }
    
    // Create the contact submission
    const contactSubmission = await ContactSubmission.create({
      name,
      email,
      subject,
      category: category || 'other',
      message,
      bookingId: bookingId || null,
      isPrivacyAgreed,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Log the submission
    SystemLog.logInfo('Contact form submission received', 'supportController', {
      submissionId: contactSubmission._id,
      email
    });
    
    console.log('Contact submission created with ID:', contactSubmission._id);
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Mesajul tău a fost trimis cu succes. Te vom contacta în curând.',
      submissionId: contactSubmission._id
    });
  } catch (error) {
    console.error('Error processing contact form submission:', error);
    SystemLog.logError('Error processing contact form submission', 'supportController', { 
      error: error.message
    });
    res.status(500).json({ 
      success: false,
      message: 'A apărut o eroare la trimiterea formularului. Te rugăm să încerci din nou.' 
    });
  }
};


exports.getPublicMaintenanceStatus = async (req, res) => {
  try {
    // Check if maintenance mode is enabled
    const maintenanceMode = await Setting.getSetting('system.maintenanceMode', false);
    
    if (!maintenanceMode) {
      return res.json({
        maintenanceMode: false
      });
    }
    
    // Get maintenance message and completion time
    const maintenanceMessage = await Setting.getSetting('system.maintenanceMessage', 
      'We are currently performing scheduled maintenance. Please check back later.');
    const completionTime = await Setting.getSetting('system.maintenanceCompletionTime', null);
    
    res.json({
      maintenanceMode: true,
      maintenanceMessage,
      completionTime
    });
  } catch (error) {
    console.error('Error checking public maintenance status:', error);
    res.status(500).json({ message: 'Error checking maintenance status' });
  }
};

// New controller function for saving maintenance customization
exports.saveMaintenanceCustomization = async (req, res) => {
  try {
    const { message, completionTime } = req.body;
    
    // Save maintenance message if provided
    if (message !== undefined) {
      await Setting.setSetting('system.maintenanceMessage', message, {
        group: 'system',
        description: 'Maintenance mode message',
        isPublic: true,
        lastUpdatedBy: req.user._id
      });
    }
    
    // Save completion time if provided
    if (completionTime !== undefined) {
      await Setting.setSetting('system.maintenanceCompletionTime', completionTime, {
        group: 'system',
        description: 'Estimated maintenance completion time',
        isPublic: true,
        lastUpdatedBy: req.user._id
      });
    }
    
    // Log the customization update
    SystemLog.logInfo('Maintenance mode customization updated', 'supportController', {
      userId: req.user._id
    });
    
    // Get the current maintenance mode status
    const maintenanceMode = await Setting.getSetting('system.maintenanceMode', false);
    
    res.json({ 
      message: 'Maintenance customization saved successfully',
      maintenanceMode,
      maintenanceMessage: message,
      completionTime
    });
  } catch (error) {
    console.error('Error saving maintenance customization:', error);
    SystemLog.logError('Error saving maintenance customization', 'supportController', { error: error.message });
    res.status(500).json({ message: 'Failed to save maintenance customization' });
  }
};

// Get all contact submissions for admin
exports.getContactSubmissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search = '' } = req.query;
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get submissions with pagination
    const submissions = await ContactSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ContactSubmission.countDocuments(query);
    
    SystemLog.logInfo('Contact submissions retrieved by admin', 'supportController', {
      userId: req.user._id,
      count: submissions.length
    });
    
    res.json({
      submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    SystemLog.logError('Error fetching contact submissions', 'supportController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch contact submissions' });
  }
};

// Get a single contact submission
exports.getSingleContactSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await ContactSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }
    
    res.json({ submission });
  } catch (error) {
    console.error(`Error fetching contact submission with ID ${req.params.id}:`, error);
    SystemLog.logError('Error fetching contact submission', 'supportController', { 
      error: error.message,
      submissionId: req.params.id
    });
    res.status(500).json({ message: 'Failed to fetch contact submission' });
  }
};

// Respond to a contact submission
exports.respondToContactSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ message: 'Response content is required' });
    }
    
    const submission = await ContactSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Contact submission not found' });
    }
    
    // Update submission status and add admin response
    submission.status = 'responded';
    submission.adminResponse = {
      content: response,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };
    
    await submission.save();
    
    // Check if there is a registered user with this email
    const user = await User.findOne({ email: submission.email });
    console.log(`Looking for user with email: ${submission.email}`, user ? `Found user: ${user._id}` : 'No user found');
    
    // If a user exists, create an in-app notification
    let notificationCreated = false;
    if (user) {
      try {
        notificationCreated = await createContactResponseNotification(submission, user, response);
        console.log(`In-app notification ${notificationCreated ? 'sent' : 'failed'} to user ${user._id} for contact response`);
      } catch (notifError) {
        console.error('Error creating in-app notification:', notifError);
        // Continue execution even if notification fails
      }
    } else {
      console.log(`No registered user found with email ${submission.email}, skipping in-app notification`);
    }
    
    // Send notification to the user's email
    const emailData = {
      to: submission.email,
      subject: `Response to your inquiry: ${submission.subject}`,
      name: submission.name,
      message: response,
      originalInquiry: submission.message
    };
    
    // Send the email using your email service
    try {
      await sendContactResponse(emailData);
      
      SystemLog.logInfo('Response sent to contact submission', 'supportController', {
        adminId: req.user._id,
        submissionId: id,
        userEmail: submission.email,
        inAppNotification: notificationCreated
      });
      
      res.json({
        message: 'Response sent successfully',
        submission: {
          ...submission._doc,
          status: 'responded'
        },
        notificationSent: notificationCreated
      });
    } catch (emailError) {
      console.error('Failed to send email response:', emailError);
      res.status(500).json({ message: 'Failed to send email response' });
    }
  } catch (error) {
    console.error(`Error responding to contact submission ${req.params.id}:`, error);
    SystemLog.logError('Error responding to contact submission', 'supportController', { 
      error: error.message,
      submissionId: req.params.id
    });
    res.status(500).json({ message: 'Failed to respond to contact submission' });
  }
};

// Helper function for sending email responses
const sendContactResponse = async (emailData) => {
  const { to, subject, name, message, originalInquiry } = emailData;
  
  try {
    // Prepare the email content using HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Response to Your Inquiry</h2>
        <p>Hello ${name},</p>
        <p>Thank you for contacting us. Here is our response to your inquiry:</p>
        
        <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #3b82f6; margin: 20px 0;">
          ${message.replace(/\n/g, '<br/>')}
        </div>
        
        <p><strong>Your original message:</strong></p>
        <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #64748b; margin: 20px 0; color: #64748b;">
          ${originalInquiry.replace(/\n/g, '<br/>')}
        </div>
        
        <p>If you have any further questions, please don't hesitate to reply to this email or submit a new contact form on our website.</p>
        
        <p>Best regards,<br>Support Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <p>This is an automated response to your contact form submission. Please do not reply to this email if your issue has been resolved.</p>
        </div>
      </div>
    `;
    
    // Use the sendEmail utility function
    return await sendEmail({
      to,
      subject,
      html: htmlContent,
      text: `Hello ${name},\n\nThank you for contacting us. Here is our response to your inquiry:\n\n${message}\n\nYour original message:\n${originalInquiry}\n\nIf you have any further questions, please don't hesitate to contact us.\n\nBest regards,\nSupport Team`
    });
  } catch (error) {
    console.error('Error sending contact response email:', error);
    throw error;
  }
}; 