const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');


let Booking, Review;
try {
  Booking = require('../models/Booking');
} catch (error) {
  console.log('Booking model not found, will use empty data for bookings');
}

try {
  Review = require('../models/Review');
} catch (error) {
  console.log('Review model not found, will use empty data for reviews');
}


const safeCountDocuments = async (model, query) => {
  if (!model) return 0;
  try {
    return await model.countDocuments(query);
  } catch (error) {
    console.error(`Error counting documents:`, error);
    return 0;
  }
};


const safeFindDocuments = async (model, query, sort, limit, populate) => {
  if (!model) return [];
  try {
    let q = model.find(query);
    if (sort) q = q.sort(sort);
    if (limit) q = q.limit(limit);
    if (populate) q = q.populate(populate);
    return await q;
  } catch (error) {
    console.error(`Error finding documents:`, error);
    return [];
  }
};

/**
 * @desc    Get recent active users (last 10)
 * @route   GET /api/admin/users/activity/recent
 * @access  Private/Admin
 */
const getRecentActiveUsers = asyncHandler(async (req, res) => {


  const recentActiveUsers = await User.find({
    lastLogin: { $exists: true, $ne: null }
  })
    .sort({ lastLogin: -1 })
    .limit(10)
    .select('_id firstName lastName email lastLogin role');


  const enhancedUsers = await Promise.all(
    recentActiveUsers.map(async (user) => {
      const bookingCount = await safeCountDocuments(Booking, { userId: user._id });
      const reviewCount = await safeCountDocuments(Review, { userId: user._id });
      
      return {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        activitySummary: {
          bookings: bookingCount,
          reviews: reviewCount,
          total: bookingCount + reviewCount
        }
      };
    })
  );

  res.json(enhancedUsers);
});

/**
 * @desc    Get user activity details
 * @route   GET /api/admin/users/:id/activity
 * @access  Private/Admin
 */
const getUserActivityDetails = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  

  const bookings = await safeFindDocuments(
    Booking, 
    { userId }, 
    { createdAt: -1 }, 
    5, 
    'hotelId'
  );
  

  const reviews = await safeFindDocuments(
    Review, 
    { userId }, 
    { createdAt: -1 }, 
    5, 
    'hotelId'
  );
  

  const activityLogs = user.activityLogs || [];
  
  res.json({
    user: {
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    },
    activitySummary: {
      bookingsCount: await safeCountDocuments(Booking, { userId }),
      reviewsCount: await safeCountDocuments(Review, { userId }),
      logsCount: activityLogs.length
    },
    recentActivity: {
      bookings: bookings.map(b => ({
        _id: b._id,
        hotel: b.hotelId?.name || 'Unknown Hotel',
        location: b.hotelId?.location || 'Unknown',
        checkIn: b.checkInDate,
        checkOut: b.checkOutDate,
        status: b.status,
        totalAmount: b.totalAmount,
        createdAt: b.createdAt
      })),
      reviews: reviews.map(r => ({
        _id: r._id,
        hotel: r.hotelId?.name || 'Unknown Hotel',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt
      })),
      recentLogs: activityLogs.slice(-5).map(log => ({
        action: log.action,
        timestamp: log.timestamp,
        details: log.details
      }))
    }
  });
});

/**
 * @desc    Get user activity statistics
 * @route   GET /api/admin/users/stats/activity
 * @access  Private/Admin
 */
const getUserActivityStats = asyncHandler(async (req, res) => {

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  

  const activeUsersCount = await User.countDocuments({
    lastLogin: { $gte: oneMonthAgo }
  });
  

  const totalUsersCount = await User.countDocuments();
  

  const newUsersCount = await User.countDocuments({
    createdAt: { $gte: oneWeekAgo }
  });
  

  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        role: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  

  const bookingsLastMonth = await safeCountDocuments(Booking, {
    createdAt: { $gte: oneMonthAgo }
  });
  
  const reviewsLastMonth = await safeCountDocuments(Review, {
    createdAt: { $gte: oneMonthAgo }
  });
  

  const dailyNewUsers = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: oneMonthAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  

  const dateMap = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dateMap[dateStr] = 0;
  }
  

  dailyNewUsers.forEach(day => {
    if (dateMap[day._id] !== undefined) {
      dateMap[day._id] = day.count;
    }
  });
  

  const dailyNewUsersArray = Object.entries(dateMap).map(([date, count]) => ({
    date,
    count
  })).reverse(); // Most recent first
  
  res.json({
    totalUsers: totalUsersCount,
    activeUsers: activeUsersCount,
    newUsers: newUsersCount,
    activePercentage: Math.round((activeUsersCount / totalUsersCount) * 100) || 0,
    usersByRole,
    engagementMetrics: {
      bookingsLastMonth,
      reviewsLastMonth,
      actionsPerUser: totalUsersCount > 0 && activeUsersCount > 0
        ? ((bookingsLastMonth + reviewsLastMonth) / activeUsersCount).toFixed(2)
        : 0
    },
    dailyNewUsers: dailyNewUsersArray
  });
});

module.exports = {
  getRecentActiveUsers,
  getUserActivityDetails,
  getUserActivityStats
}; 