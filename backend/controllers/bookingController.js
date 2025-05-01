const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const asyncHandler = require('express-async-handler');
const { generateInvoice } = require('../utils/invoiceGenerator');
const { sendEmail } = require('../utils/emailSender');
const { createBookingNotification } = require('./notificationController');
const Notification = require('../models/Notification');


exports.getBookings = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    

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
    

    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      

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


exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('service', 'name price');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    

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


exports.updateBooking = async (req, res) => {
  try {
    const { status, paymentStatus, notes } = req.body;
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
    if (paymentStatus && !['pending', 'paid', 'refunded'].includes(paymentStatus)) {
      console.log('Invalid payment status:', paymentStatus);
      return res.status(400).json({ 
        message: 'Invalid payment status. Must be one of: pending, paid, refunded' 
      });
    }
    if (status && !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      console.log('Invalid booking status:', status);
      return res.status(400).json({ 
        message: 'Invalid booking status. Must be one of: pending, confirmed, cancelled, completed' 
      });
    }
    if (status) {
      booking.status = status;
      if (status === 'confirmed' || status === 'completed') {
        booking.paymentStatus = 'paid';
      } else if (status === 'cancelled') {
        booking.paymentStatus = 'refunded';
      }
    }
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    if (notes) {
      booking.notes = notes;
    }
    if ((status === 'confirmed' || status === 'completed' || booking.paymentStatus === 'paid') && booking.totalAmount > 0) {
      const Payment = require('../models/Payment');
      
      try {
        const existingPayment = await Payment.findOne({ booking: booking._id });
        
        if (!existingPayment) {
          const invoiceNumber = await Payment.generateInvoiceNumber();
          const newPayment = new Payment({
            invoiceNumber,
            user: booking.user._id,
            booking: booking._id,
            items: [{
              description: `Booking at ${booking.hotel?.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
              quantity: 1,
              unitPrice: booking.totalAmount,
              tax: 0,
              discount: 0,
              total: booking.totalAmount
            }],
            subtotal: booking.totalAmount,
            tax: 0,
            discount: 0,
            total: booking.totalAmount,
            currency: 'RON',
            status: 'paid',
            paymentMethod: 'credit_card',
            transactionId: `TXN-${Date.now()}`,
            issueDate: new Date(),
            dueDate: new Date(),
            paidDate: new Date(),
            notes: `Payment for booking ${booking._id}`
          });
          
          await newPayment.save();
          console.log(`Created new payment record: ${newPayment._id} for booking ${booking._id}`);
        } else if (existingPayment.status !== 'paid') {
          existingPayment.status = 'paid';
          existingPayment.paidDate = new Date();
          await existingPayment.save();
          console.log(`Updated existing payment ${existingPayment._id} to paid status`);
        }
      } catch (paymentError) {
        console.error('Error creating/updating payment:', paymentError);
      }
    }

    await booking.save();
    console.log('Booking updated successfully:', {
      bookingId: booking._id,
      previousStatus,
      newStatus: status,
      previousPaymentStatus,
      newPaymentStatus: booking.paymentStatus
    });
    if ((status && status !== previousStatus) || (booking.paymentStatus !== previousPaymentStatus)) {
      try {
        const { createBookingNotification } = require('./notificationController');
        
        let notificationType = 'updated';
        if (status && status !== previousStatus) {
          if (status === 'confirmed') notificationType = 'confirmed';
          else if (status === 'cancelled') notificationType = 'cancelled';
          else if (status === 'completed') notificationType = 'completed';
        }
        
        await createBookingNotification(booking, booking.user, notificationType);
        console.log(`Notification sent to user ${booking.user._id} about booking ${notificationType}`);
      } catch (notifError) {
        console.error('Failed to send booking update notification:', notifError);
      }
    }

    const formattedBooking = booking.toObject();
    if (formattedBooking.user) {
      formattedBooking.user.name = `${formattedBooking.user.firstName || ''} ${formattedBooking.user.lastName || ''}`.trim() || 'Unknown User';
    }
    
    res.json(formattedBooking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    

    const userInfo = booking.user ? {
      id: booking.user._id,
      name: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'Unknown User',
      email: booking.user.email
    } : { id: 'unknown', name: 'Unknown User', email: 'unknown' };
    

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


exports.createHotelBooking = async (req, res) => {
  try {
    const { 
      hotel, roomType, roomDetails, checkIn, checkOut, 
      guests, totalAmount, extras, notes 
    } = req.body;

    console.log('Booking request received:', JSON.stringify({
      hotelId: hotel?.id,
      hotelName: hotel?.name,
      roomType,
      checkIn,
      checkOut,
      guests
    }, null, 2));

    if (!hotel || !roomDetails || !checkIn || !checkOut || !totalAmount) {
      console.error('Missing required booking information:', {
        hasHotel: !!hotel,
        hasRoomDetails: !!roomDetails,
        hasCheckIn: !!checkIn,
        hasCheckOut: !!checkOut,
        hasTotalAmount: !!totalAmount
      });
      return res.status(400).json({ message: 'Missing required booking information' });
    }
    
    console.log('Received hotel data:', JSON.stringify(hotel, null, 2));
    
    // Check if this is a hotel from our database
    let dbHotel = null;
    if (hotel.id) {
      try {
        dbHotel = await Hotel.findById(hotel.id);
        console.log(`Hotel found in database: ${dbHotel ? 'Yes' : 'No'}`);
      } catch (dbError) {
        console.error('Error finding hotel in database:', dbError.message);
      }
    }
    
    // If we found the hotel in our database, check availability
    if (dbHotel) {
      try {
        // Check if the requested room type is available for the selected dates
        const guestCount = typeof guests === 'number' ? guests : 
                          (guests?.adults || 0) + (guests?.children || 0);
        
        console.log(`Checking availability for room type ${roomType}, dates ${checkIn} to ${checkOut}, guests: ${guestCount}`);
        
        const isAvailable = await dbHotel.checkAvailability(
          checkIn, 
          checkOut, 
          roomType, 
          guestCount
        );
        
        if (!isAvailable) {
          console.error(`Room type ${roomType} not available for dates ${checkIn} to ${checkOut}`);
          return res.status(400).json({ 
            success: false,
            message: 'This room type is not available for the selected dates'
          });
        }
        
        // Update hotel availability by booking the room
        await dbHotel.bookRoom(
          checkIn,
          checkOut,
          roomType,
          guestCount
        );
        
        console.log(`Room ${roomType} successfully booked in hotel ${dbHotel.name} for dates ${checkIn} to ${checkOut}`);
      } catch (error) {
        console.error('Error checking/updating availability:', error);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    } else {
      console.log('Hotel not found in local database, assuming external hotel');
    }

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

    // Make sure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated or invalid user ID'
      });
    }

    // Ensure valid date objects
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid check-in or check-out dates'
      });
    }

    const booking = new Booking({
      user: req.user._id,
      hotel: hotelData,
      roomType,
      roomDetails,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
      extras: extras || [],
      notes,
      status: 'pending',
      paymentStatus: 'pending',
      date: new Date()
    });
    
    console.log('Creating booking with data:', JSON.stringify({
      user: req.user._id,
      hotel: hotelData.name,
      roomType,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalAmount
    }, null, 2));

    const createdBooking = await booking.save();
    
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

    console.log(`Booking created successfully with ID: ${createdBooking._id}`);
    res.status(201).json(createdBooking);
  } catch (error) {
    console.error('Create hotel booking error:', error);
    if (global.logToFile) {
      global.logToFile(`ERROR creating booking: ${error.message}`);
    }
    res.status(500).json({ 
      message: 'Failed to create booking', 
      error: error.message 
    });
  }
};


exports.getUserBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'active' or 'past'
    const userId = req.user._id;
    

    const currentDate = new Date();
    
    let query = { user: userId };
    

    if (type === 'active') {

      query.$or = [
        { checkOut: { $gte: currentDate } },
        { status: { $nin: ['completed', 'cancelled'] } }
      ];
    } else if (type === 'past') {

      query.$or = [
        { checkOut: { $lt: currentDate } },
        { status: { $in: ['completed', 'cancelled'] } }
      ];
    }
    

    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    

    console.log(`Found ${bookings.length} bookings for user ${userId}`);
    

    if (global.logToFile) {
      global.logToFile(`Found ${bookings.length} bookings for user ${userId}`);
      
      if (bookings.length > 0) {

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
    

    const processedBookings = bookings.map(booking => {
      const processedBooking = booking.toObject(); // Convert to plain object for manipulation
      

      if (!processedBooking.hotel) {
        processedBooking.hotel = {
          name: 'Hotel',
          location: 'Location not specified',
          image: null
        };
        console.warn(`Added missing hotel object for booking ${processedBooking._id}`);
      } else {

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


exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    

    if (booking.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ 
        message: `Cannot cancel a booking with status: ${booking.status}` 
      });
    }

    const Payment = require('../models/Payment');
    
    try {

      const existingPayment = await Payment.findOne({ booking: booking._id });
      
      if (existingPayment) {

        existingPayment.status = 'refunded';
        

        const refundTransactionId = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        

        if (!existingPayment.refunds) {
          existingPayment.refunds = [];
        }
        

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

        const invoiceNumber = await Payment.generateInvoiceNumber();
        

        const refundItem = {
          description: `Refund for cancelled booking at ${booking.hotel?.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
          quantity: 1,
          unitPrice: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount
        };
        

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
    

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
    

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


exports.updateBookingPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, notes } = req.body;
    

    if (!paymentStatus || !['pending', 'paid', 'refunded', 'partially_refunded'].includes(paymentStatus)) {
      return res.status(400).json({ 
        message: 'Valid payment status (pending, paid, refunded, partially_refunded) is required' 
      });
    }
    
    console.log('Booking payment status update requested:', { id, paymentStatus });
    

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    

    const previousStatus = booking.paymentStatus;
    booking.paymentStatus = paymentStatus;
    

    if (notes) {
      booking.notes = booking.notes ? `${booking.notes}\n${notes}` : notes;
    }
    

    await booking.save();
    

    if (global.logToFile) {
      global.logToFile(`Booking payment status updated:
        ID: ${booking._id}
        Previous status: ${previousStatus}
        New status: ${paymentStatus}
        Updated by: ${req.user.firstName} ${req.user.lastName} (${req.user._id})
        Notes: ${notes || 'No notes provided'}
      `);
    }
    

    if (paymentStatus === 'paid') {
      const Payment = require('../models/Payment');
      

      const existingPayment = await Payment.findOne({ booking: booking._id });
      
      if (!existingPayment) {

        const invoiceNumber = await Payment.generateInvoiceNumber();
        

        const bookingItem = {
          description: `Booking at ${booking.hotel.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
          quantity: 1,
          unitPrice: booking.totalAmount,
          tax: 0,
          discount: 0,
          total: booking.totalAmount
        };
        

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


exports.confirmBooking = asyncHandler(async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    

    const isAdmin = req.user.role === 'admin';
    const isBookingOwner = booking.user.toString() === req.user._id.toString();
    
    if (!isAdmin && !isBookingOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    booking.status = 'confirmed';
    booking.confirmationDate = Date.now();
    
    const updatedBooking = await booking.save();
    
    console.log(`Booking ${booking._id} confirmed by ${isAdmin ? 'admin' : 'user'} ${req.user._id}`);
    

    try {
      const notificationUtil = require('../utils/notificationUtil');
      const bookingUser = await User.findById(booking.user);
      
      if (bookingUser) {
        await notificationUtil.createBookingNotification(updatedBooking, bookingUser, 'confirmed');
        console.log(`Confirmation notification sent to user ${booking.user}`);
      }
    } catch (notifError) {
      console.error('Failed to create booking confirmation notification:', notifError);

    }
    

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

    }
    
    res.json(updatedBooking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});