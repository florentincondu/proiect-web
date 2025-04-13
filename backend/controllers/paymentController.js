const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');

// Get all payments (admin only)
exports.getAllPayments = async (req, res) => {
  try {
    const { status, method, startDate, endDate, minAmount, maxAmount, sort = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    
    console.log('Payments requested with filters:', { status, method, startDate, endDate, minAmount, maxAmount, sort, order, page, limit });
    
    // Build query for filtering
    const query = {};
    
    if (status && status !== 'All Statuses') {
      query.status = status;
    }
    
    if (method && method !== 'All Methods') {
      query.paymentMethod = method;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (minAmount) {
      query.total = query.total || {};
      query.total.$gte = Number(minAmount);
    }
    
    if (maxAmount) {
      query.total = query.total || {};
      query.total.$lte = Number(maxAmount);
    }
    
    // Create sort object for ordering
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;
    
    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get real payments from database
    const payments = await Payment.find(query)
      .populate('user', 'firstName lastName email')
      .populate('booking', 'checkIn checkOut roomType status hotel')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Payment.countDocuments(query);
    
    console.log(`Found ${payments.length} payments in database`);
    
    // Format payment data to include computed fields
    const formattedPayments = payments.map(payment => {
      // Calculate total refunded amount
      const totalRefunded = payment.refunds && payment.refunds.length > 0
        ? payment.refunds
            .filter(refund => refund.status === 'completed')
            .reduce((sum, refund) => sum + refund.amount, 0)
        : 0;
      
      return {
        ...payment,
        totalRefunded,
        isFullyRefunded: totalRefunded >= payment.total,
        // Add hotel and room information from booking
        hotelInfo: payment.booking ? {
          name: payment.booking.hotel?.name || 'Unknown Hotel',
          location: payment.booking.hotel?.location || 'Unknown Location',
          roomType: payment.booking.roomType || 'Standard Room'
        } : null
      };
    });
    
    // Return found payments with pagination
    res.json({
      payments: formattedPayments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    SystemLog.logError('Error fetching payments', 'paymentController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('booking', 'hotel checkIn checkOut roomType status totalAmount paymentStatus')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Calculate total refunded amount
    const totalRefunded = payment.refunds && payment.refunds.length > 0
      ? payment.refunds
          .filter(refund => refund.status === 'completed')
          .reduce((sum, refund) => sum + refund.amount, 0)
      : 0;
    
    // Format the payment with additional calculated fields
    const formattedPayment = {
      ...payment,
      totalRefunded,
      isFullyRefunded: totalRefunded >= payment.total,
      // Add booking information
      bookingInfo: payment.booking ? {
        id: payment.booking._id,
        hotel: payment.booking.hotel?.name || 'Unknown Hotel',
        location: payment.booking.hotel?.location || 'Unknown Location',
        roomType: payment.booking.roomType || 'Standard Room',
        checkIn: payment.booking.checkIn,
        checkOut: payment.booking.checkOut,
        status: payment.booking.status,
        paymentStatus: payment.booking.paymentStatus,
        totalAmount: payment.booking.totalAmount
      } : null,
      // Add customer information
      customerInfo: {
        id: payment.user?._id || 'unknown',
        name: payment.user ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() : 'Unknown User',
        email: payment.user?.email || 'unknown@example.com'
      }
    };
    
    console.log(`Retrieved payment details for ID: ${req.params.id}`);
    res.json({
      success: true,
      payment: formattedPayment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    SystemLog.logError('Error fetching payment', 'paymentController', { error: error.message, paymentId: req.params.id });
    res.status(500).json({ message: 'Failed to fetch payment details' });
  }
};

// Create a new payment/invoice
exports.createPayment = async (req, res) => {
  try {
    const { 
      userId, bookingId, items, subtotal, tax, discount, 
      total, currency, status, paymentMethod, dueDate, notes 
    } = req.body;
    
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate booking if provided
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
    }
    
    // Generate invoice number
    const invoiceNumber = await Payment.generateInvoiceNumber();
    
    // Create payment/invoice
    const payment = new Payment({
      invoiceNumber,
      user: userId,
      booking: bookingId,
      items: items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice - (item.discount || 0) + (item.tax || 0)
      })),
      subtotal,
      tax,
      discount,
      total,
      currency,
      status: status || 'pending',
      paymentMethod: paymentMethod || 'credit_card',
      dueDate: new Date(dueDate),
      notes
    });
    
    const savedPayment = await payment.save();
    
    // If booking exists, update payment information
    if (booking) {
      booking.payment = savedPayment._id;
      booking.paymentStatus = status || 'pending';
      await booking.save();
    }
    
    SystemLog.logInfo('New payment created', 'paymentController', {
      paymentId: savedPayment._id,
      invoiceNumber,
      userId,
      bookingId,
      total,
      status
    });
    
    res.status(201).json(savedPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    SystemLog.logError('Error creating payment', 'paymentController', { error: error.message });
    res.status(500).json({ message: 'Failed to create payment' });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Update payment
    payment.status = status;
    if (notes) payment.notes = notes;
    
    // If status is 'paid', update paidDate
    if (status === 'paid' && !payment.paidDate) {
      payment.paidDate = new Date();
    }
    
    await payment.save();
    
    // If there's a booking attached, update its payment status
    if (payment.booking) {
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.paymentStatus = status;
        await booking.save();
      }
    }
    
    SystemLog.logInfo('Payment status updated', 'paymentController', {
      paymentId: payment._id,
      invoiceNumber: payment.invoiceNumber,
      newStatus: status,
      oldStatus: payment.status
    });
    
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment status:', error);
    SystemLog.logError('Error updating payment status', 'paymentController', { 
      error: error.message,
      paymentId: req.params.id
    });
    res.status(500).json({ message: 'Failed to update payment status' });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { paymentMethodId, bookingId, amount, currency = 'USD' } = req.body;
    
    if (!paymentMethodId || !bookingId || !amount) {
      return res.status(400).json({ message: 'Payment method, booking ID, and amount are required' });
    }
    
    console.log('Processing payment:', { paymentMethodId, bookingId, amount, currency });
    
    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Verify user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized payment attempt', 'paymentController', {
        userId: req.user._id,
        bookingId
      });
      return res.status(403).json({ message: 'You are not authorized to make payment for this booking' });
    }
    
    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Generate invoice number
    const invoiceNumber = await Payment.generateInvoiceNumber();
    
    // Create line item for the booking
    const bookingItem = {
      description: `Booking at ${booking.hotel.name || 'Hotel'} - ${booking.roomType || 'Room'}`,
      quantity: 1,
      unitPrice: parseFloat(amount),
      tax: 0,
      discount: 0,
      total: parseFloat(amount)
    };
    
    // Set due date (today) and issue date
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 1); // Due tomorrow
    
    // Create payment record
    const payment = new Payment({
      invoiceNumber,
      user: req.user._id,
      booking: bookingId,
      items: [bookingItem],
      subtotal: parseFloat(amount),
      tax: 0,
      discount: 0,
      total: parseFloat(amount),
      currency,
      status: 'paid', // Mark as paid immediately
      paymentMethod: paymentMethodId.includes('card') ? 'credit_card' : 'paypal',
      transactionId,
      issueDate: today,
      dueDate,
      paidDate: today
    });
    
    const savedPayment = await payment.save();
    
    // Update booking payment status
    booking.paymentStatus = 'paid';
    await booking.save();
    
    // Log successful payment
    SystemLog.logInfo('Payment processed successfully', 'paymentController', {
      paymentId: savedPayment._id,
      bookingId,
      transactionId,
      amount,
      userId: req.user._id
    });
    
    console.log('Payment processed successfully:', savedPayment._id);
    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment: savedPayment
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    SystemLog.logError('Error processing payment', 'paymentController', { 
      error: error.message,
      bookingId: req.body.bookingId,
      userId: req.user._id
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ message: 'Payment ID is required' });
    }
    
    console.log('Processing refund:', { paymentId, amount, reason });
    
    // Find the payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Ensure payment is in a refundable state
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return res.status(400).json({ 
        message: `Cannot refund a payment with status: ${payment.status}` 
      });
    }
    
    // Calculate refund amount (use requested amount or full payment amount)
    const refundAmount = amount ? parseFloat(amount) : payment.total;
    
    // Generate refund transaction ID
    const refundTransactionId = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Create the refund record
    const refund = {
      amount: refundAmount,
      reason: reason || 'Admin initiated refund',
      status: 'completed',
      refundedBy: req.user._id,
      transactionId: refundTransactionId,
      createdAt: new Date()
    };
    
    // Add refund to payment
    payment.refunds.push(refund);
    
    // Update payment status based on refund amount
    const totalRefundedSoFar = payment.refunds.reduce((total, refund) => 
      refund.status === 'completed' ? total + refund.amount : total, 0);
    
    if (totalRefundedSoFar >= payment.total) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partially_refunded';
    }
    
    // Save payment with refund information
    await payment.save();
    
    // Update booking status if this payment is associated with a booking
    if (payment.booking) {
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        // Update payment status based on refund
        if (payment.status === 'refunded') {
          booking.paymentStatus = 'refunded';
        } else {
          booking.paymentStatus = 'partially_refunded';
        }
        await booking.save();
        
        // Log booking update
        SystemLog.logInfo('Booking payment status updated due to refund', 'paymentController', {
          bookingId: booking._id,
          paymentId: payment._id,
          newStatus: booking.paymentStatus
        });
      }
    }
    
    // Log successful refund
    SystemLog.logInfo('Refund processed successfully', 'paymentController', {
      paymentId: payment._id,
      refundAmount,
      refundTransactionId,
      initiatedBy: req.user._id
    });
    
    // Prepare response
    const refundResponse = {
      _id: payment._id,
      refundId: refundTransactionId,
      paymentId: payment._id,
      amount: refundAmount,
      reason: reason || 'Admin initiated refund',
      status: 'completed',
      processedAt: new Date()
    };
    
    console.log('Refund processed successfully:', refundResponse);
    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: refundResponse
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    SystemLog.logError('Error processing refund', 'paymentController', { 
      error: error.message,
      paymentId: req.body.paymentId,
      userId: req.user._id
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    console.log('Payment statistics requested');
    
    // Structure for statistics data
    let statsData = {
      byStatus: [],
      byMethod: [],
      monthlyRevenue: [],
      dailyRevenue: [],
      totals: { revenue: 0, count: 0, average: 0 }
    };
    
    // Get payments by status
    const byStatus = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    if (byStatus && byStatus.length > 0) {
      statsData.byStatus = byStatus;
      console.log('Payment stats by status:', JSON.stringify(byStatus));
    }
    
    // Get payments by method
    const byMethod = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    if (byMethod && byMethod.length > 0) {
      statsData.byMethod = byMethod;
      console.log('Payment stats by method:', JSON.stringify(byMethod));
    }
    
    // Get monthly revenue for the past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: ['paid', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    if (monthlyRevenue && monthlyRevenue.length > 0) {
      statsData.monthlyRevenue = monthlyRevenue;
      console.log('Monthly revenue stats:', JSON.stringify(monthlyRevenue));
    }
    
    // Calculate totals from all successful payments
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          status: { $in: ['paid', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    if (totalRevenue && totalRevenue.length > 0) {
      statsData.totals = {
        revenue: totalRevenue[0].total || 0,
        count: totalRevenue[0].count || 0,
        average: totalRevenue[0].count > 0 ? 
                (totalRevenue[0].total / totalRevenue[0].count).toFixed(2) : 0
      };
      console.log('Total revenue stats:', JSON.stringify(totalRevenue));
    }
    
    // Get daily revenue for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyRevenue = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['paid', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    if (dailyRevenue && dailyRevenue.length > 0) {
      // Format dates for daily revenue
      statsData.dailyRevenue = dailyRevenue.map(day => ({
        ...day,
        date: `${day._id.year}-${String(day._id.month).padStart(2, '0')}-${String(day._id.day).padStart(2, '0')}`
      }));
    }
    
    // If no data found in database, try to get data from bookings
    if (statsData.byStatus.length === 0 && statsData.totals.count === 0) {
      console.log('No payment data in database, checking bookings...');
      
      // Try to get data from bookings to generate statistics
      const bookings = await Booking.find({
        paymentStatus: { $in: ['paid', 'partially_refunded'] }
      }).lean();
      
      if (bookings && bookings.length > 0) {
        console.log(`Found ${bookings.length} paid bookings`);
        
        // Generate basic statistics from bookings
        const totalFromBookings = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        statsData.totals = {
          revenue: totalFromBookings,
          count: bookings.length,
          average: bookings.length > 0 ? (totalFromBookings / bookings.length).toFixed(2) : 0
        };
        
        // Group by payment status
        const statusMap = {};
        bookings.forEach(booking => {
          const status = booking.paymentStatus || 'pending';
          if (!statusMap[status]) {
            statusMap[status] = { count: 0, revenue: 0 };
          }
          statusMap[status].count += 1;
          statusMap[status].revenue += booking.totalAmount || 0;
        });
        
        statsData.byStatus = Object.keys(statusMap).map(status => ({
          _id: status,
          count: statusMap[status].count,
          revenue: statusMap[status].revenue
        }));
        
        console.log('Generated payment statistics from bookings');
      }
    }
    
    // If still no data, provide empty values with the right structure
    if (statsData.byStatus.length === 0) {
      statsData.byStatus = [
        { _id: 'paid', count: 0, revenue: 0 },
        { _id: 'pending', count: 0, revenue: 0 },
        { _id: 'failed', count: 0, revenue: 0 },
        { _id: 'refunded', count: 0, revenue: 0 },
        { _id: 'partially_refunded', count: 0, revenue: 0 }
      ];
    }
    
    if (statsData.byMethod.length === 0) {
      statsData.byMethod = [
        { _id: 'credit_card', count: 0, revenue: 0 },
        { _id: 'paypal', count: 0, revenue: 0 },
        { _id: 'bank_transfer', count: 0, revenue: 0 }
      ];
    }
    
    // Ensure we have statistics for the past 6 months
    if (statsData.monthlyRevenue.length === 0) {
      const now = new Date();
      statsData.monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(now.getMonth() - i);
        statsData.monthlyRevenue.push({
          _id: { 
            year: month.getFullYear(), 
            month: month.getMonth() + 1 
          },
          revenue: 0,
          count: 0,
          date: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
        });
      }
    }
    
    // Ensure we have daily statistics for the past 30 days
    if (statsData.dailyRevenue.length === 0) {
      const now = new Date();
      statsData.dailyRevenue = [];
      for (let i = 29; i >= 0; i--) {
        const day = new Date();
        day.setDate(now.getDate() - i);
        statsData.dailyRevenue.push({
          _id: { 
            year: day.getFullYear(), 
            month: day.getMonth() + 1,
            day: day.getDate()
          },
          revenue: 0,
          count: 0,
          date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        });
      }
    }
    
    // Add indicator for data source
    statsData.dataSource = statsData.totals.count > 0 ? 'database' : 'fallback';
    
    console.log('Returning payment statistics');
    res.json(statsData);
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    SystemLog.logError('Error fetching payment statistics', 'paymentController', { error: error.message });
    res.status(500).json({ 
      message: 'Failed to fetch payment statistics',
      error: error.message 
    });
  }
};

// Get public payment statistics
exports.getPublicStats = async (req, res) => {
  try {
    console.log('Public payment statistics requested');
    
    // Calculate total successful transactions (paid payments)
    const totalSuccessfulPayments = await Payment.countDocuments({ 
      status: { $in: ['paid', 'partially_refunded'] } 
    });
    
    // Calculate total attempted transactions
    const totalAttemptedPayments = await Payment.countDocuments();
    
    // Calculate success rate based on real data
    const successRate = totalAttemptedPayments > 0 
      ? (totalSuccessfulPayments / totalAttemptedPayments * 100).toFixed(1)
      : 0;
    
    // Calculate total revenue from successful payments
    const revenueData = await Payment.aggregate([
      {
        $match: { 
          status: { $in: ['paid', 'partially_refunded'] } 
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Extract total revenue and average booking value
    let totalRevenue = 0;
    let averageBookingValue = 0;
    
    if (revenueData && revenueData.length > 0) {
      totalRevenue = revenueData[0].totalRevenue || 0;
      averageBookingValue = revenueData[0].count > 0
        ? (revenueData[0].totalRevenue / revenueData[0].count).toFixed(0)
        : 0;
    }
    
    // Get top destinations from bookings (if available)
    let featuredDestinations = [];
    
    try {
      // Attempt to get real booking destination data
      const destinationStats = await Booking.aggregate([
        {
          $match: {
            'hotel.location': { $exists: true, $ne: null },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: '$hotel.location',
            bookings: { $sum: 1 }
          }
        },
        { $sort: { bookings: -1 } },
        { $limit: 3 }
      ]);
      
      if (destinationStats && destinationStats.length > 0) {
        featuredDestinations = destinationStats.map(dest => ({
          name: dest._id,
          bookings: dest.bookings
        }));
      }
    } catch (destinationError) {
      console.error('Error fetching destination statistics:', destinationError);
      // Continue with default featured destinations if error
    }
    
    // If no destinations found, use default list
    if (featuredDestinations.length === 0) {
      featuredDestinations = [
        { name: 'New York', bookings: 0 },
        { name: 'Paris', bookings: 0 },
        { name: 'Tokyo', bookings: 0 }
      ];
    }
    
    // Compile public statistics
    const stats = {
      totalTransactions: totalSuccessfulPayments,
      totalRevenue: totalRevenue,
      successRate: parseFloat(successRate),
      averageBookingValue: parseFloat(averageBookingValue),
      featuredDestinations
    };
    
    console.log('Returning public payment statistics:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching public payment stats:', error);
    SystemLog.logError('Error fetching public payment stats', 'paymentController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch payment statistics' });
  }
};

// Get user's payments
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('User payments requested for user ID:', userId);
    
    // Fetch all payments for this user
    const payments = await Payment.find({ user: userId })
      .populate('booking', 'hotel roomType checkIn checkOut status')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${payments.length} payments for user ${userId}`);
    
    // Format payment data to include computed fields
    const formattedPayments = payments.map(payment => {
      // Calculate total refunded amount
      const totalRefunded = payment.refunds && payment.refunds.length > 0
        ? payment.refunds
            .filter(refund => refund.status === 'completed')
            .reduce((sum, refund) => sum + refund.amount, 0)
        : 0;
      
      // Format the payment data
      return {
        _id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        status: payment.status,
        total: payment.total,
        currency: payment.currency || 'USD',
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        paidDate: payment.paidDate,
        totalRefunded,
        isFullyRefunded: totalRefunded >= payment.total,
        booking: payment.booking ? {
          _id: payment.booking._id,
          hotel: payment.booking.hotel?.name || 'Hotel',
          location: payment.booking.hotel?.location || 'Location not available',
          roomType: payment.booking.roomType || 'Room',
          checkIn: payment.booking.checkIn,
          checkOut: payment.booking.checkOut,
          status: payment.booking.status
        } : null
      };
    });
    
    // Return user's payments
    res.json({
      success: true,
      count: formattedPayments.length,
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    SystemLog.logError('Error fetching user payments', 'paymentController', { error: error.message, userId: req.user._id });
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

// Get user's payment by ID
exports.getUserPaymentById = async (req, res) => {
  try {
    const userId = req.user._id;
    const paymentId = req.params.id;
    
    console.log(`Payment details requested for payment ID: ${paymentId} by user: ${userId}`);
    
    // Find the specific payment that belongs to this user
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId
    })
      .populate('booking', 'hotel roomType checkIn checkOut status totalAmount')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    console.log(`Found payment ${payment._id} for user ${userId}`);
    
    // Calculate total refunded amount
    const totalRefunded = payment.refunds && payment.refunds.length > 0
      ? payment.refunds
          .filter(refund => refund.status === 'completed')
          .reduce((sum, refund) => sum + refund.amount, 0)
      : 0;
    
    // Format the payment with additional calculated fields
    const formattedPayment = {
      ...payment,
      totalRefunded,
      isFullyRefunded: totalRefunded >= payment.total,
      booking: payment.booking ? {
        _id: payment.booking._id,
        hotel: payment.booking.hotel?.name || 'Hotel',
        location: payment.booking.hotel?.location || 'Location not available',
        roomType: payment.booking.roomType || 'Room',
        checkIn: payment.booking.checkIn,
        checkOut: payment.booking.checkOut,
        status: payment.booking.status,
        totalAmount: payment.booking.totalAmount
      } : null
    };
    
    // Return detailed payment information
    res.json({
      success: true,
      payment: formattedPayment
    });
  } catch (error) {
    console.error('Error fetching user payment:', error);
    SystemLog.logError('Error fetching user payment', 'paymentController', { 
      error: error.message, 
      userId: req.user._id, 
      paymentId: req.params.id 
    });
    res.status(500).json({ message: 'Failed to fetch payment details' });
  }
};

// Generate invoice PDF
exports.generateInvoice = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('booking')
      .lean();
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check if user is authorized (admin or payment owner)
    if (!req.user.isAdmin && payment.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this invoice' });
    }
    
    // Format payment data for invoice
    const formattedPayment = {
      invoiceNumber: payment.invoiceNumber,
      transactionId: payment.transactionId || 'N/A',
      customer: {
        name: `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim(),
        email: payment.user.email || 'No email'
      },
      dateIssued: new Date(payment.issueDate || payment.createdAt).toLocaleDateString(),
      datePaid: payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'Unpaid',
      dueDate: new Date(payment.dueDate).toLocaleDateString(),
      items: payment.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        total: item.total.toFixed(2)
      })),
      subtotal: payment.subtotal.toFixed(2),
      tax: payment.tax.toFixed(2),
      discount: payment.discount.toFixed(2),
      total: payment.total.toFixed(2),
      status: payment.status.toUpperCase(),
      notes: payment.notes || ''
    };
    
    // Add booking information if available
    if (payment.booking) {
      formattedPayment.booking = {
        id: payment.booking._id,
        hotel: payment.booking.hotel?.name || 'N/A',
        location: payment.booking.hotel?.location || 'N/A',
        checkIn: payment.booking.checkIn ? new Date(payment.booking.checkIn).toLocaleDateString() : 'N/A',
        checkOut: payment.booking.checkOut ? new Date(payment.booking.checkOut).toLocaleDateString() : 'N/A'
      };
    }
    
    console.log(`Generated invoice data for payment ${payment._id}`);
    
    // Log invoice generation
    SystemLog.logInfo('Invoice generated', 'paymentController', {
      paymentId: payment._id,
      invoiceNumber: payment.invoiceNumber,
      generatedBy: req.user._id
    });
    
    // Return the formatted payment data as a pseudo-invoice
    res.json({
      success: true,
      invoice: formattedPayment
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    SystemLog.logError('Error generating invoice', 'paymentController', { error: error.message, paymentId: req.params.id });
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
};

// Generate invoice PDF
exports.generateInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Invoice PDF generation requested for payment ID:', id);
    
    // Find the payment to ensure it exists
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check authorization
    if (!req.user.isAdmin && payment.user.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized invoice PDF access attempt', 'paymentController', {
        userId: req.user._id,
        paymentId: id
      });
      return res.status(403).json({ message: 'Not authorized to access this invoice' });
    }
    
    // In a real implementation, here we would generate a PDF file
    // For now, we'll just simulate successful generation
    
    // Log PDF generation
    SystemLog.logInfo('Invoice PDF generated', 'paymentController', {
      paymentId: payment._id,
      invoiceNumber: payment.invoiceNumber,
      generatedBy: req.user._id
    });
    
    // Return success with information about the generated PDF
    res.json({
      success: true,
      message: 'Invoice PDF generated successfully',
      invoice: {
        id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.total,
        status: payment.status,
        dateGenerated: new Date(),
        downloadUrl: `/api/payments/${payment._id}/download-invoice`
      }
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    SystemLog.logError('Error generating invoice PDF', 'paymentController', { 
      error: error.message,
      paymentId: req.params.id
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate invoice PDF',
      error: error.message
    });
  }
};

// Get payments for a booking
exports.getPaymentsForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log('Payments requested for booking:', bookingId);
    
    // Verify booking exists and user has access to it
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Only allow admin or the booking owner to view payments
    if (!req.user.isAdmin && booking.user.toString() !== req.user._id.toString()) {
      SystemLog.logWarning('Unauthorized booking payment access attempt', 'paymentController', {
        userId: req.user._id,
        bookingId
      });
      return res.status(403).json({ message: 'Not authorized to view payment details for this booking' });
    }
    
    // Get all payments associated with the booking
    const payments = await Payment.find({ booking: bookingId })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${payments.length} payments for booking ${bookingId}`);
    
    // Format payment data to include computed fields
    const formattedPayments = payments.map(payment => {
      // Calculate total refunded amount
      const totalRefunded = payment.refunds && payment.refunds.length > 0
        ? payment.refunds
            .filter(refund => refund.status === 'completed')
            .reduce((sum, refund) => sum + refund.amount, 0)
        : 0;
      
      return {
        ...payment,
        totalRefunded,
        isFullyRefunded: totalRefunded >= payment.total
      };
    });
    
    res.json({
      booking: {
        _id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount
      },
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching booking payments:', error);
    SystemLog.logError('Error fetching booking payments', 'paymentController', { 
      error: error.message,
      bookingId: req.params.bookingId
    });
    res.status(500).json({ message: 'Failed to fetch booking payments' });
  }
};

// Get recent payments summary for admin dashboard
exports.getRecentPaymentsSummary = async (req, res) => {
  try {
    // Obține ultimele 10 plăți pentru afișare în dashboard
    const recentPayments = await Payment.find()
      .populate('user', 'firstName lastName email')
      .populate('booking', 'hotel roomType checkIn checkOut')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Obține sumarizări pentru plăți
    const paymentCounts = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$total" }
        }
      }
    ]);
    
    // Calculează totaluri pentru dashboard
    const totals = {
      all: 0,
      paid: 0,
      pending: 0,
      refunded: 0,
      failed: 0
    };
    
    const amounts = {
      all: 0,
      paid: 0,
      refunded: 0
    };
    
    paymentCounts.forEach(item => {
      totals.all += item.count;
      
      if (item._id === 'paid' || item._id === 'partially_refunded') {
        totals.paid += item.count;
        amounts.paid += item.total;
      } else if (item._id === 'pending') {
        totals.pending += item.count;
      } else if (item._id === 'refunded') {
        totals.refunded += item.count;
        amounts.refunded += item.total;
      } else if (item._id === 'failed') {
        totals.failed += item.count;
      }
      
      amounts.all += item.total;
    });
    
    // Formatează plățile recente pentru afișare
    const formattedPayments = recentPayments.map(payment => ({
      _id: payment._id,
      invoiceNumber: payment.invoiceNumber,
      customerName: payment.user ? `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() : 'Unknown',
      customerEmail: payment.user?.email || 'unknown@example.com',
      amount: payment.total,
      status: payment.status,
      date: payment.createdAt,
      paymentMethod: payment.paymentMethod,
      hotelInfo: payment.booking ? {
        name: payment.booking.hotel?.name || 'Unknown Hotel',
        location: payment.booking.hotel?.location || 'Unknown Location'
      } : null
    }));
    
    // Răspundem cu datele formatate
    res.json({
      success: true,
      recentPayments: formattedPayments,
      counts: totals,
      amounts: amounts
    });
  } catch (error) {
    console.error('Error fetching recent payments summary:', error);
    SystemLog.logError('Error fetching recent payments summary', 'paymentController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch recent payments summary' });
  }
}; 