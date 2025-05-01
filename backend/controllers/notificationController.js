const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all notifications for the current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  try {

    const userId = req.user._id;
    
    console.log(`Fetching notifications for user: ${userId}`);
    

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent
    
    console.log(`Found ${notifications.length} notifications for user: ${userId}`);
    
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

/**
 * @desc    Create a new notification
 * @route   POST /api/notifications
 * @access  Private/Admin
 */
const createNotification = asyncHandler(async (req, res) => {
  try {
    const { userId, type, title, message, referenceId, referenceModel } = req.body;
    

    if (!userId || !title || !message) {
      return res.status(400).json({ message: 'Missing required fields (userId, title, message)' });
    }
    
    console.log(`Creating notification for user: ${userId}, type: ${type}`);
    

    const notification = await Notification.createNotification({
      userId,
      type,
      title,
      message,
      referenceId,
      referenceModel
    });
    
    console.log(`Notification created with ID: ${notification._id}`);
    
    res.status(201).json({ message: 'Notification created', notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
});

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    console.log(`Marking notification ${id} as read for user: ${userId}`);
    

    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      console.log(`Notification ${id} not found for user ${userId}`);
      return res.status(404).json({ message: 'Notification not found' });
    }
    

    notification.read = true;
    await notification.save();
    
    console.log(`Notification ${id} marked as read successfully`);
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`Marking all notifications as read for user: ${userId}`);
    

    const result = await Notification.markAllAsRead(userId);
    
    console.log(`Marked ${result.modifiedCount} notifications as read for user: ${userId}`);
    
    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    console.log(`Deleting notification ${id} for user: ${userId}`);
    

    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    
    if (!notification) {
      console.log(`Notification ${id} not found for user ${userId}`);
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    console.log(`Notification ${id} deleted successfully`);
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

/**
 * @desc    Create notification on booking confirmation
 * @param   {Object} booking - The booking object
 * @param   {Object} user - The user object
 * @param   {String} action - Optional action type (confirmed, updated, cancelled)
 * @access  Private/Internal
 */
const createBookingNotification = async (booking, user, action = 'confirmed') => {
  try {
    console.log(`Creating booking notification for user: ${user._id}, booking: ${booking._id}, action: ${action}`);
    
    if (!user || !user._id) {
      console.error('Invalid user object provided to createBookingNotification');
      return false;
    }
    

    const hotelName = booking.hotel?.name || booking.hotelName || 'Hotel';
    

    let title, message;
    
    switch (action) {
      case 'confirmed':
        title = 'Rezervare confirmată';
        message = `Rezervarea ta la ${hotelName} a fost confirmată.`;
        break;
      case 'updated':
        title = 'Booking Updated';
        message = `Your booking at ${hotelName} has been updated. Check your bookings for details.`;
        break;
      case 'cancelled':
        title = 'Booking Cancelled';
        message = `Your booking at ${hotelName} has been cancelled.`;
        break;
      case 'payment_updated':
        title = 'Payment Status Updated';
        message = `Payment status for your booking at ${hotelName} has been updated.`;
        break;
      default:
        title = 'Booking Update';
        message = `There's an update to your booking at ${hotelName}.`;
    }
    
    const notification = await Notification.createNotification({
      userId: user._id,
      type: 'booking',
      title,
      message,
      referenceId: booking._id,
      referenceModel: 'Booking'
    });
    
    console.log(`Booking notification created with ID: ${notification._id}`);
    return true;
  } catch (error) {
    console.error('Error creating booking notification:', error);
    return false;
  }
};

/**
 * @desc    Create notification for support ticket response
 * @param   {Object} ticket - The support ticket object
 * @param   {Object} user - The user object
 * @access  Private/Internal
 */
const createSupportResponseNotification = async (ticket, user) => {
  try {
    console.log(`Creating support response notification for user: ${user._id}, ticket: ${ticket._id}`);
    

    const subject = ticket.subject || 'your support request';
    
    const notification = await Notification.createNotification({
      userId: user._id,
      type: 'support',
      title: 'New Response to Your Support Request',
      message: `Your support request "${subject}" has received a new response.`,
      referenceId: ticket._id,
      referenceModel: 'SupportTicket'
    });
    
    console.log(`Support notification created with ID: ${notification._id}`);
    return true;
  } catch (error) {
    console.error('Error creating support notification:', error);
    return false;
  }
};

/**
 * @desc    Create notification for contact form submission response
 * @param   {Object} submission - The contact submission object
 * @param   {Object} user - The user object who submitted the contact form (if registered)
 * @param   {String} response - The admin response to the contact form
 * @access  Private/Internal
 */
const createContactResponseNotification = async (submission, user, response) => {
  try {
    if (!user || !user._id) {
      console.log('No user provided for contact response notification');
      return false;
    }
    
    console.log(`Creating contact response notification for user: ${user._id}, submission: ${submission._id}`);
    
    const subject = submission.subject || 'your contact inquiry';
    const shortResponse = response.length > 50 ? `${response.substring(0, 50)}...` : response;
    
    const notification = await Notification.createNotification({
      userId: user._id,
      type: 'contact',
      title: 'Răspuns la solicitarea ta',
      message: `Solicitarea ta "${subject}" a primit un răspuns: "${shortResponse}"`,
      referenceId: submission._id,
      referenceModel: 'ContactSubmission',
      data: { responseContent: response }
    });
    
    console.log(`Contact response notification created with ID: ${notification._id}`);
    return true;
  } catch (error) {
    console.error('Error creating contact response notification:', error);
    return false;
  }
};

/**
 * @desc    Generate a test notification for the current user
 * @route   POST /api/notifications/test
 * @access  Private
 */
const generateTestNotification = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'system' } = req.body;
    
    console.log(`Generating test notification for user: ${userId}, type: ${type}`);
    

    if (!Notification) {
      console.error('Notification model not available');
      return res.status(500).json({ message: 'Notification model not available' });
    }
    

    let title, message;
    if (type === 'booking') {
      title = 'Test Booking Notification';
      message = 'This is a test booking notification from the system.';
    } else if (type === 'support') {
      title = 'Test Support Notification';
      message = 'This is a test support notification from the system.';
    } else {
      title = 'Test System Notification';
      message = 'This is a test system notification.';
    }
    

    const notification = new Notification({
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date()
    });
    
    await notification.save();
    
    console.log(`Test notification created with ID: ${notification._id}`);
    
    res.status(201).json({ 
      message: 'Test notification created',
      notification 
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ message: 'Error creating test notification', error: error.message });
  }
});

module.exports = {
  getUserNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createBookingNotification,
  createSupportResponseNotification,
  createContactResponseNotification,
  generateTestNotification
}; 