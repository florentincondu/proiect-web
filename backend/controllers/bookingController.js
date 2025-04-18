const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const asyncHandler = require('express-async-handler');
const { generateInvoice } = require('../utils/invoiceGenerator');
const { sendEmail } = require('../utils/emailSender');
const { createBookingNotification } = require('./notificationController');
const Notification = require('../models/Notification');

// Get all bookings (admin only)
exports.getBookings = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // Build query based on filters
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email')
      .populate('service', 'name price')
      .sort({ createdAt: -1 });
    
    // Format the bookings to include calculated fields
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      // Add a full name property for the user if it exists
      if (bookingObj.user) {
        bookingObj.user.name = `${bookingObj.user.firstName || ''} ${bookingObj.user.lastName || ''}`.trim() || 'Unknown User';
      }
      
      return bookingObj;
    });
    
    res.json(formattedBookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking by ID (admin only)
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('service', 'name price');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Format the booking to include user's full name
    const formattedBooking = booking.toObject();
    if (formattedBooking.user) {
      formattedBooking.user.name = `${formattedBooking.user.firstName || ''} ${formattedBooking.user.lastName || ''}`.trim() || 'Unknown User';
    }
    
    res.json(formattedBooking);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking (admin only)
exports.updateBooking = async (req, res) => {
  try {
    const { status, paymentStatus, notes } = req.body;
    
    // Log the incoming request
    console.log('Update booking request:', {
      bookingId: req.params.id,
      status,
      paymentStatus,
      notes
    });

    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!booking) {
      console.log('Booking not found:', req.params.id);
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const previousStatus = booking.status;
    const previousPaymentStatus = booking.paymentStatus;
    
    // Validate payment status if provided
    if (paymentStatus && !['pending', 'paid', 'refunded'].includes(paymentStatus)) {
      console.log('Invalid payment status:', paymentStatus);
      return res.status(400).json({ 
        message: 'Invalid payment status. Must be one of: pending, paid, refunded' 
      });
    }

    // Validate booking status if provided
    if (status && !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      console.log('Invalid booking status:', status);
      return res.status(400).json({ 
        message: 'Invalid booking status. Must be one of: pending, confirmed, cancelled, completed' 
      });
    }

    // Update the booking
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (notes) booking.notes = notes;

    await booking.save();
    
    // Log the successful update
    console.log('Booking updated successfully:', {
      bookingId: booking._id,
      previousStatus,
      newStatus: status,
      previousPaymentStatus,
      newPaymentStatus: paymentStatus
    });

    res.json(booking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ 
      message: 'Failed to update booking',
      error: error.message 
    });
  }
};

// Delete booking (admin only)
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Prepare user info for logging
    const userInfo = booking.user ? {
      id: booking.user._id,
      name: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'Unknown User',
      email: booking.user.email
    } : { id: 'unknown', name: 'Unknown User', email: 'unknown' };
    
    // Log the delete operation if global logger is available
    if (global.logToFile) {
      global.logToFile(`Booking deleted:
        ID: ${booking._id}
        User: ${userInfo.name} (${userInfo.email})
        Hotel: ${booking.hotel?.name || 'Unknown Hotel'}
        Status: ${booking.status}
        Deleted by admin: ${req.user.firstName} ${req.user.lastName} (${req.user._id})
      `);
    }
    
    await booking.deleteOne();
    
    res.json({ 
      message: 'Booking deleted successfully',
      bookingId: booking._id,
      userInfo: userInfo
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking statistics (admin only)
exports.getBookingStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    
    res.json({
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      completedBookings
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new hotel booking
exports.createHotelBooking = async (req, res) => {
  try {
    const { 
      hotel, roomType, roomDetails, checkIn, checkOut, 
      guests, totalAmount, extras, notes 
    } = req.body;

    // Validate required fields
    if (!hotel || !roomDetails || !checkIn || !checkOut || !totalAmount) {
      return res.status(400).json({ message: 'Missing required booking information' });
    }
    
    // Log the received hotel data
    console.log('Received hotel data:', JSON.stringify(hotel, null, 2));
    
    // Ensure hotel has name and location
    const hotelData = {
      id: hotel.id || null,
      name: hotel.name || 'Hotel',
      location: hotel.location || 'Location not specified',
      image: hotel.image || null
    };
    
    if (!hotel.name || !hotel.location) {
      if (global.logToFile) {
        global.logToFile(`WARN creating booking: Fixed missing hotel data: ${JSON.stringify(hotelData)}`);
      }
      console.warn('Creating booking with fixed hotel information:', hotelData);
    }

    const booking = new Booking({
      user: req.user._id,
      hotel: hotelData,
      roomType,
      roomDetails,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      totalAmount,
      extras: extras || [],
      notes,
      status: 'pending',
      paymentStatus: 'pending',
      date: new Date()
    });

    const createdBooking = await booking.save();
    
    // Log the successful booking creation
    if (global.logToFile) {
      global.logToFile(`Booking created successfully:
        User: ${req.user._id}
        Hotel: ${hotelData.name}
        Location: ${hotelData.location}
        Room: ${roomType}
        Check-in: ${checkIn}
        Check-out: ${checkOut}
        Booking ID: ${createdBooking._id}
      `);
    }

    res.status(201).json(createdBooking);
  } catch (error) {
    console.error('Create hotel booking error:', error);
    if (global.logToFile) {
      global.logToFile(`ERROR creating booking: ${error.message}`);
    }
    res.status(500).json({ message: 'Failed to create booking' });
  }
};

// Get user's bookings (for logged in user)
exports.getUserBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'active' or 'past'
    const userId = req.user._id;
    
    // Determine current date for comparison
    const currentDate = new Date();
    
    let query = { user: userId };
    
    // If type is specified, filter by active or past
    if (type === 'active') {
      // Active bookings: checkOut date is in the future OR status is not 'completed' or 'cancelled'
      query.$or = [
        { checkOut: { $gte: currentDate } },
        { status: { $nin: ['completed', 'cancelled'] } }
      ];
    } else if (type === 'past') {
      // Past bookings: checkOut date is in the past AND status is 'completed' or 'cancelled'
      query.$or = [
        { checkOut: { $lt: currentDate } },
        { status: { $in: ['completed', 'cancelled'] } }
      ];
    }
    
    // Fetch bookings with complete hotel and room details
    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    // Log for debugging
    console.log(`Found ${bookings.length} bookings for user ${userId}`);
    
    // Enhanced logging to file 
    if (global.logToFile) {
      global.logToFile(`Found ${bookings.length} bookings for user ${userId}`);
      
      if (bookings.length > 0) {
        // Log detailed information about the first booking
        const firstBooking = bookings[0];
        global.logToFile(`Sample booking details: 
          ID: ${firstBooking._id}
          Hotel Name: ${firstBooking.hotel?.name || 'Missing hotel name'}
          Hotel Location: ${firstBooking.hotel?.location || 'Missing location'}
          Room Type: ${firstBooking.roomType || 'Missing room type'}
          Room Name: ${firstBooking.roomDetails?.name || 'Missing room name'}
          Check-in: ${firstBooking.checkIn}
          Check-out: ${firstBooking.checkOut}
          Status: ${firstBooking.status}
          Hotel object: ${JSON.stringify(firstBooking.hotel)}
        `);
      }
    }
    
    if (bookings.length > 0) {
      console.log('First booking sample:', JSON.stringify({
        id: bookings[0]._id,
        hotel: bookings[0].hotel,
        roomType: bookings[0].roomType,
        roomDetails: bookings[0].roomDetails,
        checkIn: bookings[0].checkIn,
        checkOut: bookings[0].checkOut,
        status: bookings[0].status
      }, null, 2));
    }
    
    // Make sure each booking has hotel information
    const processedBookings = bookings.map(booking => {
      const processedBooking = booking.toObject(); // Convert to plain object for manipulation
      
      // If hotel name or location is missing, attempt to fill with default values
      if (!processedBooking.hotel) {
        processedBooking.hotel = {
          name: 'Hotel',
          location: 'Location not specified',
          image: null
        };
        console.warn(`Added missing hotel object for booking ${processedBooking._id}`);
      } else {
        // Ensure all hotel properties exist
        if (!processedBooking.hotel.name) {
          processedBooking.hotel.name = 'Hotel';
          console.warn(`Added missing hotel name for booking ${processedBooking._id}`);
        }
        
        if (!processedBooking.hotel.location) {
          processedBooking.hotel.location = 'Location not specified';
          console.warn(`Added missing hotel location for booking ${processedBooking._id}`);
        }
        
        if (!processedBooking.hotel.image) {
          processedBooking.hotel.image = null;
        }
      }
      
      return processedBooking;
    });
    
    res.json(processedBookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    if (global.logToFile) {
      global.logToFile(`ERROR getting user bookings: ${error.message}`);
    }
    res.status(500).json({ message: 'Failed to retrieve bookings' });
  }
};

// Cancel a booking (for user)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if this booking belongs to the user
    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    
    // Only allow cancellation for pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ 
        message: `Cannot cancel a booking with status: ${booking.status}` 
      });
    }

    const Payment = require('../models/Payment');
    
    try {
      // Check if a payment already exists for this booking
      const existingPayment = await Payment.findOne({ booking: booking._id });
      
      if (existingPayment) {
        // Update existing payment to refunded status
        existingPayment.status = 'refunded';
        
        // Generate refund transaction ID
        const refundTransactionId = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Initialize refunds array if it doesn't exist
        if (!existingPayment.refunds) {
          existingPayment.refunds = [];
        }
        
        // Add refund record
        existingPayment.refunds.push({
          amount: existingPayment.total,
          reason: 'Booking cancelled by user',
          status: 'completed',
          refundedBy: req.user._id,
          transactionId: refundTransactionId,
          createdAt: new Date()
        });
        
        await existingPayment.save();
        
        if (global.logToFile) {
          global.logToFile(`Payment ${existingPayment._id} updated to refunded status for booking ${booking._id}`);
        }
        console.log(`Existing payment ${existingPayment._id} updated to refunded status for booking ${booking._id}`);
      } else if (booking.totalAmount > 0) {
        // Create a new payment record for refund
        const invoiceNumber = await Payment.generateInvoiceNumber();
        
        // Create line item for the refund
        const refundItem = {
          description: `Refund for cancelled booking at ${booking.hotel?.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
          quantity: 1,
          unitPrice: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount
        };
        
        // Generate refund transaction ID
        const refundTransactionId = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        const newPayment = new Payment({
          invoiceNumber,
          user: booking.user._id,
          booking: booking._id,
          items: [refundItem],
          subtotal: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount,
          currency: 'USD',
          status: 'refunded',
          paymentMethod: 'credit_card',
          transactionId: refundTransactionId,
          issueDate: new Date(),
          dueDate: new Date(),
          paidDate: new Date(),
          notes: 'Payment refunded due to booking cancellation',
          refunds: [{
            amount: booking.totalAmount,
            reason: 'Booking cancelled by user',
            status: 'completed',
            refundedBy: req.user._id,
            transactionId: refundTransactionId,
            createdAt: new Date()
          }]
        });
        
        await newPayment.save();
        
        if (global.logToFile) {
          global.logToFile(`New refund payment record created for booking ${booking._id} with invoice number ${invoiceNumber}`);
        }
        console.log(`New refund payment record created for booking ${booking._id} with invoice number ${invoiceNumber}`);
      }
    } catch (paymentError) {
      console.error('Failed to create/update payment record for refund:', paymentError);
      if (global.logToFile) {
        global.logToFile(`ERROR creating/updating refund payment: ${paymentError.message}\n${paymentError.stack}`);
      }
    }
    
    // Update booking status after payment handling
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
    
    // Send notification about cancellation
    try {
      const { createBookingNotification } = require('./notificationController');
      await createBookingNotification(booking, booking.user, 'cancelled');
      console.log(`Cancellation notification sent to user ${booking.user._id}`);
    } catch (notifError) {
      console.error('Failed to send cancellation notification:', notifError);
    }
    
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    if (global.logToFile) {
      global.logToFile(`ERROR cancelling booking: ${error.message}\n${error.stack}`);
    }
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
};

// Update booking payment status (admin only)
exports.updateBookingPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, notes } = req.body;
    
    // Validate payment status
    if (!paymentStatus || !['pending', 'paid', 'refunded', 'partially_refunded'].includes(paymentStatus)) {
      return res.status(400).json({ 
        message: 'Valid payment status (pending, paid, refunded, partially_refunded) is required' 
      });
    }
    
    console.log('Booking payment status update requested:', { id, paymentStatus });
    
    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Update payment status
    const previousStatus = booking.paymentStatus;
    booking.paymentStatus = paymentStatus;
    
    // Add notes if provided
    if (notes) {
      booking.notes = booking.notes ? `${booking.notes}\n${notes}` : notes;
    }
    
    // Save updated booking
    await booking.save();
    
    // Log payment status update
    if (global.logToFile) {
      global.logToFile(`Booking payment status updated:
        ID: ${booking._id}
        Previous status: ${previousStatus}
        New status: ${paymentStatus}
        Updated by: ${req.user.firstName} ${req.user.lastName} (${req.user._id})
        Notes: ${notes || 'No notes provided'}
      `);
    }
    
    // Check if we need to create a payment record (if status is 'paid' and no payment exists)
    if (paymentStatus === 'paid') {
      const Payment = require('../models/Payment');
      
      // Check if a payment already exists for this booking
      const existingPayment = await Payment.findOne({ booking: booking._id });
      
      if (!existingPayment) {
        // Create a new payment record
        const invoiceNumber = await Payment.generateInvoiceNumber();
        
        // Create line item for the booking
        const bookingItem = {
          description: `Booking at ${booking.hotel.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
          quantity: 1,
          unitPrice: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount
        };
        
        // Set due date and issue date
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 1);
        
        const newPayment = new Payment({
          invoiceNumber,
          user: booking.user,
          booking: booking._id,
          items: [bookingItem],
          subtotal: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount,
          currency: 'USD',
          status: 'paid',
          paymentMethod: 'credit_card', // Default method
          transactionId: `ADMIN-${Date.now()}`,
          issueDate: today,
          dueDate,
          paidDate: today,
          notes: `Payment created by admin: ${req.user.firstName} ${req.user.lastName}`
        });
        
        await newPayment.save();
        
        if (global.logToFile) {
          global.logToFile(`New payment record created for booking ${booking._id} with invoice number ${invoiceNumber}`);
        }
      } else if (existingPayment.status !== 'paid') {
        // Update existing payment to paid status
        existingPayment.status = 'paid';
        existingPayment.paidDate = new Date();
        await existingPayment.save();
        
        if (global.logToFile) {
          global.logToFile(`Existing payment ${existingPayment._id} updated to paid status for booking ${booking._id}`);
        }
      }
    }
    
    res.json({ 
      message: 'Booking payment status updated successfully',
      booking: {
        _id: booking._id,
        paymentStatus: booking.paymentStatus,
        updatedAt: booking.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating booking payment status:', error);
    if (global.logToFile) {
      global.logToFile(`ERROR updating booking payment status: ${error.message}`);
    }
    res.status(500).json({ message: 'Failed to update booking payment status' });
  }
};

// Confirm a booking (user side)
exports.confirmBooking = asyncHandler(async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check authorization
    const isAdmin = req.user.role === 'admin';
    const isBookingOwner = booking.user.toString() === req.user._id.toString();
    
    if (!isAdmin && !isBookingOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    booking.status = 'confirmed';
    booking.confirmationDate = Date.now();
    
    const updatedBooking = await booking.save();
    
    console.log(`Booking ${booking._id} confirmed by ${isAdmin ? 'admin' : 'user'} ${req.user._id}`);
    
    // Create notification for the booking owner
    try {
      const notificationUtil = require('../utils/notificationUtil');
      const bookingUser = await User.findById(booking.user);
      
      if (bookingUser) {
        await notificationUtil.createBookingNotification(updatedBooking, bookingUser, 'confirmed');
        console.log(`Confirmation notification sent to user ${booking.user}`);
      }
    } catch (notifError) {
      console.error('Failed to create booking confirmation notification:', notifError);
      // Continue even if notification creation fails
    }
    
    // Send confirmation email
    try {
      const user = await User.findById(booking.user);
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: 'Your booking has been confirmed',
          text: `Your booking at ${booking.hotel?.name || 'Hotel'} has been confirmed. Check your account for details.`
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }
    
    res.json(updatedBooking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});