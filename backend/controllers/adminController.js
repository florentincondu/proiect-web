const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const SystemLog = require('../models/SystemLog');
const Hotel = require('../models/Hotel');
const PlacePrice = require('../models/PlacePrice');
const PlaceRestriction = require('../models/PlaceRestriction');
const mongoose = require('mongoose');

// Get dashboard summary data
exports.getDashboardSummary = async (req, res) => {
  try {
    console.log('Dashboard summary requested');

    // Get real data from database
    let realData = {
      totalUsers: 0,
      totalBookings: 0,
      totalRevenue: 0,
      pendingBookings: 0,
      recentBookings: [],
      userRegistrations: []
    };

    try {
      // Count total users
      realData.totalUsers = await User.countDocuments({});
      
      // Count total bookings
      realData.totalBookings = await Booking.countDocuments({});
      
      // Count pending bookings
      realData.pendingBookings = await Booking.countDocuments({ status: 'pending' });
      
      // Calculate total revenue
      console.log('Calculating total revenue...');
      const revenueData = await Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partially_refunded'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      
      console.log('Revenue aggregation result:', JSON.stringify(revenueData));
      
      if (revenueData.length > 0) {
        realData.totalRevenue = revenueData[0].total;
        console.log(`Total revenue calculated: ${realData.totalRevenue}`);
      } else {
        console.log('No revenue data returned from aggregation');
        
        // Let's try a more direct approach as a fallback
        const payments = await Payment.find({ status: { $in: ['paid', 'partially_refunded'] } });
        console.log(`Found ${payments.length} payments with paid status`);
        
        if (payments.length > 0) {
          // Calculate total manually
          let totalRevenue = 0;
          for (const payment of payments) {
            console.log(`Payment ID: ${payment._id}, Total: ${payment.total}`);
            totalRevenue += payment.total || 0;
          }
          realData.totalRevenue = totalRevenue;
          console.log(`Manually calculated total revenue: ${totalRevenue}`);
        }
      }
      
      // Get recent bookings with user and hotel details
      realData.recentBookings = await Booking.find()
        .populate('user', 'firstName lastName email profileImage')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      realData.recentBookings = realData.recentBookings.map(booking => ({
        id: booking._id,
        user: {
          id: booking.user?._id || 'unknown',
          name: booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Unknown User',
          email: booking.user?.email || 'unknown@example.com',
          avatar: booking.user?.profileImage || '/default-avatar.png'
        },
        hotel: {
          id: booking.hotel?._id || 'unknown',
          name: booking.hotel?.name || booking.hotelName || 'Unknown Hotel',
          location: booking.hotel?.location || booking.hotelLocation || 'Unknown Location',
          image: booking.hotel?.featuredImage || '/default-hotel.jpg'
        },
        roomType: booking.roomType || 'Standard Room',
        checkIn: booking.checkIn || new Date(),
        checkOut: booking.checkOut || new Date(),
        status: booking.status || 'pending',
        paymentStatus: booking.paymentStatus || 'pending',
        amount: booking.totalAmount || 0,
        createdAt: booking.createdAt || new Date(),
      }));
      
      // Get user registrations over past 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const userRegistrations = await User.aggregate([
        { 
          $match: { 
            createdAt: { $gte: oneWeekAgo } 
          } 
        },
        {
          $group: {
            _id: { 
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      realData.userRegistrations = userRegistrations;
      
      console.log('Real dashboard data fetched successfully');
    } catch (dbError) {
      console.error('Error fetching real dashboard data:', dbError);
      // We'll continue with whatever real data we were able to fetch
    }
    
    // If no real bookings data, provide fallback with zeros
    if (realData.recentBookings.length === 0) {
      console.log('No real booking data found, using fallback with zeros');
      
      // Provide structure with zeros for the frontend
      realData.recentBookings = Array(5).fill(0).map((_, i) => ({
        id: `mock-${i + 1}`,
        user: {
          id: `user-${i + 1}`,
          name: "No Bookings",
          email: "no-bookings@example.com",
          avatar: "/default-avatar.png"
        },
        hotel: {
          id: `hotel-${i + 1}`,
          name: "No Hotel Bookings",
          location: "N/A",
          image: "/default-hotel.jpg"
        },
        roomType: "N/A",
        checkIn: new Date(),
        checkOut: new Date(),
        status: "none",
        paymentStatus: "none",
        amount: 0,
        createdAt: new Date()
      }));
    }
    
    // Format and return the dashboard data
    const dashboardData = {
      statistics: {
        totalUsers: realData.totalUsers,
        totalBookings: realData.totalBookings,
        totalRevenue: realData.totalRevenue,
        pendingBookings: realData.pendingBookings
      },
      recentBookings: realData.recentBookings,
      userRegistrations: realData.userRegistrations.length > 0 ? 
        realData.userRegistrations : 
        Array(7).fill(0).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            _id: date.toISOString().split('T')[0],
            count: 0
          };
        })
    };
    
    // Add stats alias for backwards compatibility
    dashboardData.stats = dashboardData.statistics;
    
    console.log('Returning dashboard summary data');
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    
    // Send simplified error response
    res.status(500).json({ 
      message: 'Failed to fetch dashboard summary',
      error: error.message 
    });
  }
};

// Get recent activity logs
exports.getRecentLogs = async (req, res) => {
  try {
    console.log('Recent logs requested');
    
    // Try to fetch real logs from the database
    let logs = [];
    
    try {
      // Get the most recent 20 system logs
      logs = await SystemLog.find()
        .sort({ timestamp: -1 })
        .limit(20)
        .populate('userId', 'firstName lastName email')
        .lean();
      
      console.log(`Found ${logs.length} real logs in database`);
    } catch (dbError) {
      console.error('Error fetching logs from database:', dbError);
      // If database fetch fails, we'll fall back to empty array
    }
    
    // Format logs for frontend consumption
    const formattedLogs = logs.map(log => {
      // Create standard action based on log level and action
      let action = log.action || 'System event';
      if (log.level === 'error') action = 'Error reported';
      if (log.level === 'warning') action = 'Warning triggered';
      
      return {
        id: log._id,
        user: log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() : 'System',
        action: action,
        module: log.module || 'system',
        message: log.message,
        timestamp: log.timestamp,
        level: log.level
      };
    });
    
    // If no logs found, create some sample activity
    if (formattedLogs.length === 0) {
      console.log('No real logs found, creating sample activity data');
      
      const now = new Date();
      
      // Create sample activity data with realistic timestamps
      formattedLogs.push(
        {
          id: 'sample-1',
          user: 'System',
          action: 'User registered',
          module: 'users',
          message: 'New user account created',
          timestamp: new Date(now.getTime() - 10 * 60000), // 10 minutes ago
          level: 'info'
        },
        {
          id: 'sample-2',
          user: 'Admin',
          action: 'Booking created',
          module: 'bookings',
          message: 'New booking confirmed',
          timestamp: new Date(now.getTime() - 25 * 60000), // 25 minutes ago
          level: 'info'
        },
        {
          id: 'sample-3',
          user: 'System',
          action: 'Payment processed',
          module: 'payments',
          message: 'Payment successfully processed',
          timestamp: new Date(now.getTime() - 45 * 60000), // 45 minutes ago
          level: 'info'
        },
        {
          id: 'sample-4',
          user: 'Admin',
          action: 'Hotel updated',
          module: 'hotels',
          message: 'Hotel details updated',
          timestamp: new Date(now.getTime() - 120 * 60000), // 2 hours ago
          level: 'info'
        },
        {
          id: 'sample-5',
          user: 'System',
          action: 'System maintenance',
          module: 'system',
          message: 'Routine system maintenance completed',
          timestamp: new Date(now.getTime() - 240 * 60000), // 4 hours ago
          level: 'info'
        }
      );
    }
    
    console.log('Returning activity logs data, count:', formattedLogs.length);
    res.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.status(500).json({ message: 'Failed to fetch recent logs' });
  }
};

// Create a new system log entry
exports.createLogEntry = async (req, res) => {
  try {
    const { action, message, level = 'info', module } = req.body;
    
    if (!action || !message) {
      return res.status(400).json({ message: 'Action and message are required' });
    }
    
    // Mock response for log creation
    const mockLog = {
      _id: Math.random().toString(36).substring(2, 15),
      action,
      message,
      level,
      module,
      userId: req.user ? req.user._id : null,
      timestamp: new Date()
    };
    
    console.log('Created mock log entry:', mockLog);
    res.status(201).json(mockLog);
  } catch (error) {
    console.error('Error creating log entry:', error);
    res.status(500).json({ message: 'Error creating log entry' });
  }
};

// Funcții pentru gestionarea hotelurilor de către admin

// Obține toate hotelurile pentru panoul de administrare
exports.getHotelsForAdmin = async (req, res) => {
  try {
    const hotels = await Hotel.find().sort({ name: 1 }).lean();
    res.json(hotels);
  } catch (error) {
    console.error('Error fetching hotels for admin:', error);
    res.status(500).json({ message: 'Error fetching hotels', error: error.message });
  }
};

// Caută hoteluri după nume
exports.searchHotels = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const hotels = await Hotel.find({
      name: { $regex: name, $options: 'i' }
    }).sort({ name: 1 }).lean();

    res.json(hotels);
  } catch (error) {
    console.error('Error searching hotels:', error);
    res.status(500).json({ message: 'Error searching hotels', error: error.message });
  }
};

// Obține un hotel specific după ID
exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).lean();
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    res.json(hotel);
  } catch (error) {
    console.error('Error fetching hotel details:', error);
    res.status(500).json({ message: 'Error fetching hotel details', error: error.message });
  }
};

// Actualizează prețurile unui hotel
exports.updateHotelPrice = async (req, res) => {
  try {
    const { price, roomPrices } = req.body;
    
    if (!price && !roomPrices) {
      return res.status(400).json({ message: 'Price or room prices are required' });
    }
    
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    // Actualizează prețul de bază al hotelului dacă este furnizat
    if (price !== undefined) {
      hotel.price = price;
    }
    
    // Actualizează prețurile camerelor, dacă sunt furnizate
    if (roomPrices && Array.isArray(roomPrices)) {
      roomPrices.forEach(roomPrice => {
        const room = hotel.rooms.find(r => r._id.toString() === roomPrice.roomId);
        if (room) {
          room.price = roomPrice.price;
        }
      });
    }
    
    await hotel.save();
    
    // Înregistrează acțiunea în log
    const logEntry = new SystemLog({
      userId: req.user._id,
      action: 'update_hotel_price',
      module: 'hotel',
      level: 'info',
      message: `Updated prices for hotel "${hotel.name}"`,
      details: {
        hotelId: hotel._id,
        hotelName: hotel.name,
        updatedPrice: price,
        updatedRoomPrices: roomPrices
      }
    });
    
    await logEntry.save();
    
    res.json({
      message: 'Hotel prices updated successfully',
      hotel
    });
  } catch (error) {
    console.error('Error updating hotel prices:', error);
    res.status(500).json({ message: 'Error updating hotel prices', error: error.message });
  }
};

// Actualizează restricțiile unui hotel
exports.updateHotelRestrictions = async (req, res) => {
  try {
    const { isRestricted, restrictionReason, restrictedDates } = req.body;
    
    const hotel = await Hotel.findById(req.params.id);
    
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    // Adaugă câmpuri pentru restricții dacă nu există deja
    if (!hotel.restrictions) {
      hotel.restrictions = {};
    }
    
    // Actualizează starea restricționării
    if (isRestricted !== undefined) {
      hotel.restrictions.isRestricted = isRestricted;
    }
    
    // Actualizează motivul restricției
    if (restrictionReason) {
      hotel.restrictions.reason = restrictionReason;
    }
    
    // Actualizează datele restricționate
    if (restrictedDates && Array.isArray(restrictedDates)) {
      hotel.restrictions.restrictedDates = restrictedDates;
    }
    
    await hotel.save();
    
    // Înregistrează acțiunea în log
    const logEntry = new SystemLog({
      userId: req.user._id,
      action: 'update_hotel_restrictions',
      module: 'hotel',
      level: 'info',
      message: `Updated restrictions for hotel "${hotel.name}"`,
      details: {
        hotelId: hotel._id,
        hotelName: hotel.name,
        isRestricted,
        restrictionReason,
        restrictedDates
      }
    });
    
    await logEntry.save();
    
    res.json({
      message: 'Hotel restrictions updated successfully',
      hotel
    });
  } catch (error) {
    console.error('Error updating hotel restrictions:', error);
    res.status(500).json({ message: 'Error updating hotel restrictions', error: error.message });
  }
};

// Places API hotel management functions

// Get saved prices for places (hotels)
exports.getPlacesPrices = async (req, res) => {
  try {
    const prices = await PlacePrice.find().sort({ updatedAt: -1 }).lean();
    res.json({
      success: true,
      prices: prices.map(price => ({
        placeId: price.placeId,
        name: price.name,
        price: price.price,
        updatedAt: price.updatedAt,
        updatedBy: price.updatedBy
      }))
    });
  } catch (error) {
    console.error('Error fetching places prices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching places prices',
      error: error.message
    });
  }
};

// Update price for a hotel from Places API
exports.updatePlacePrice = async (req, res) => {
  try {
    const { placeId, name, price } = req.body;
    
    console.log(`Updating price for hotel: ${name} (${placeId}) to ${price}`);
    
    if (!placeId || !price) {
      return res.status(400).json({ 
        success: false,
        message: 'Place ID and price are required'
      });
    }
    
    // Create a log entry for this action
    const logEntry = new SystemLog({
      userId: req.user._id,
      action: 'update_place_price',
      module: 'hotel',
      level: 'info',
      message: `Updated price for Place hotel "${name || placeId}"`,
      details: {
        placeId,
        name,
        updatedPrice: price,
        userId: req.user._id,
        userEmail: req.user.email
      }
    });
    
    await logEntry.save();
    
    // Upsert price record in the PlacePrice model
    const updatedPrice = await PlacePrice.findOneAndUpdate(
      { placeId: placeId },
      { 
        $set: { 
          placeId: placeId,
          name: name || 'Unknown Hotel',
          price: parseFloat(price),
          updatedAt: new Date(),
          updatedBy: {
            userId: req.user._id.toString(),
            email: req.user.email
          }
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`Price updated successfully in database: ${JSON.stringify(updatedPrice)}`);
    
    res.json({
      success: true,
      message: 'Hotel price updated successfully'
    });
  } catch (error) {
    console.error('Error updating Place price:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating hotel price', 
      error: error.message 
    });
  }
};

// Update restrictions for a hotel from Places API
exports.updatePlaceRestriction = async (req, res) => {
  try {
    const { placeId, name, isRestricted, reason } = req.body;
    
    if (!placeId) {
      return res.status(400).json({ 
        success: false,
        message: 'Place ID is required'
      });
    }
    
    // Create a log entry for this action
    const logEntry = new SystemLog({
      userId: req.user._id,
      action: 'update_place_restriction',
      module: 'hotel',
      level: 'info',
      message: `${isRestricted ? 'Restricted' : 'Activated'} Place hotel "${name || placeId}"`,
      details: {
        placeId,
        name,
        isRestricted,
        reason,
        userId: req.user._id,
        userEmail: req.user.email
      }
    });
    
    await logEntry.save();
    
    // Update restrictions in the PlaceRestriction model
    await PlaceRestriction.findOneAndUpdate(
      { placeId: placeId },
      { 
        $set: { 
          placeId: placeId,
          name: name || 'Unknown Hotel',
          isRestricted: isRestricted,
          reason: reason || '',
          updatedAt: new Date(),
          updatedBy: {
            userId: req.user._id.toString(),
            email: req.user.email
          }
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      message: `Hotel ${isRestricted ? 'restricted' : 'activated'} successfully`
    });
  } catch (error) {
    console.error('Error updating Place restriction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating hotel restriction', 
      error: error.message 
    });
  }
};

// Get all hotel restrictions
exports.getPlacesRestrictions = async (req, res) => {
  try {
    const restrictions = await PlaceRestriction.find({}).lean();
    
    res.json({
      success: true,
      restrictions: restrictions
    });
  } catch (error) {
    console.error('Error fetching Places restrictions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching hotel restrictions', 
      error: error.message 
    });
  }
}; 