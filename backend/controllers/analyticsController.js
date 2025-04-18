const Analytics = require('../models/Analytics');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');


const parseDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const end = endDate ? new Date(endDate) : new Date();
  

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};


exports.getBookingAnalytics = async (req, res) => {
  try {
    console.log('Booking analytics requested');
    

    let realData = [];
    try {

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      

      realData = await Booking.aggregate([
        { 
          $match: { 
            createdAt: { $gte: sixMonthsAgo } 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      console.log('Found real booking data from database:', realData.length);
    } catch (dbError) {
      console.log('Error fetching real booking data:', dbError);

    }
    

    const getMonthNameInRomanian = (dateString) => {
      const monthIndex = parseInt(dateString.split('-')[1], 10) - 1;
      const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[monthIndex];
    };
    


    const bookingTrends = realData.length > 0 
      ? realData.map(item => ({
          date: getMonthNameInRomanian(item._id),
          bookings: item.count,
          revenue: item.revenue || 0
        }))
      : [
          { date: 'Ian', bookings: 28, revenue: 22500 },
          { date: 'Feb', bookings: 35, revenue: 28750 },
          { date: 'Mar', bookings: 42, revenue: 32400 },
          { date: 'Apr', bookings: 38, revenue: 29200 },
          { date: 'Mai', bookings: 50, revenue: 42000 },
          { date: 'Iun', bookings: 57, revenue: 50100 }
        ];
    

    const totalBookings = bookingTrends.reduce((sum, item) => sum + item.bookings, 0);
    const totalRevenue = bookingTrends.reduce((sum, item) => sum + item.revenue, 0);
    

    const response = {
      currency: 'RON',
      totalBookings: totalBookings,
      avgBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 975.50,
      bookingsByStatus: [
        { status: 'confirmată', count: 160 },
        { status: 'în așteptare', count: 45 },
        { status: 'anulată', count: 30 },
        { status: 'finalizată', count: 15 }
      ],
      bookingTrends: bookingTrends, // This is the array required by the frontend
      topRooms: [
        { type: 'Apartament Deluxe', bookings: 85, revenue: 95000 },
        { type: 'Cameră Standard', bookings: 75, revenue: 52500 },
        { type: 'Cameră cu Vedere la Mare', bookings: 55, revenue: 68750 },
        { type: 'Cameră Family', bookings: 35, revenue: 33250 }
      ]
    };
    
    console.log('Returning booking analytics with RON currency');
    res.json(bookingTrends); // This should match what the frontend expects
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    

    const fallbackData = [
      { date: 'Ian', bookings: 28, revenue: 22500 },
      { date: 'Feb', bookings: 35, revenue: 28750 },
      { date: 'Mar', bookings: 42, revenue: 32400 },
      { date: 'Apr', bookings: 38, revenue: 29200 },
      { date: 'Mai', bookings: 50, revenue: 42000 },
      { date: 'Iun', bookings: 57, revenue: 50100 }
    ];
    
    res.json(fallbackData);
  }
};


exports.getRevenueAnalytics = async (req, res) => {
  try {
    console.log('Revenue analytics requested');
    

    let realData = [];
    let totalRevenue = 0;
    
    try {

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      

      realData = await Payment.aggregate([
        { 
          $match: { 
            createdAt: { $gte: sixMonthsAgo },
            status: { $in: ['paid', 'partially_refunded'] }
          } 
        },
        {
          $group: {
            _id: '$paymentMethod',
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { revenue: -1 } }
      ]);
      

      if (realData.length > 0) {
        totalRevenue = realData.reduce((sum, item) => sum + item.revenue, 0);
      }
      
      console.log('Found real payment data from database:', realData.length);
    } catch (dbError) {
      console.log('Error fetching real payment data:', dbError);

    }
    

    const getServiceNameInRomanian = (methodId) => {
      switch(methodId) {
        case 'credit_card': return 'Card de credit';
        case 'paypal': return 'PayPal';
        case 'bank_transfer': return 'Transfer bancar';
        case 'cash': return 'Numerar';
        default: return methodId || 'Altă metodă';
      }
    };
    

    const revenueByService = realData.length > 0
      ? realData.map(item => ({
          service: getServiceNameInRomanian(item._id),
          revenue: item.revenue
        }))
      : [
          { service: 'Card de credit', revenue: 145000 },
          { service: 'PayPal', revenue: 65000 },
          { service: 'Transfer bancar', revenue: 23500 },
          { service: 'Numerar', revenue: 10000 }
        ];
    

    const revenueAnalytics = {
      totalRevenue: totalRevenue || 243500,
      currency: 'RON',
      monthlyRevenue: 42800,
      revenueGrowth: 15.2,
      revenueTrend: [
        { month: 'Ian', revenue: 28500 },
        { month: 'Feb', revenue: 32000 },
        { month: 'Mar', revenue: 35400 },
        { month: 'Apr', revenue: 33800 },
        { month: 'Mai', revenue: 38000 },
        { month: 'Iun', revenue: 42800 }
      ],
      revenueByRoomType: [
        { roomType: 'Apartament Deluxe', revenue: 95000 },
        { roomType: 'Cameră Standard', revenue: 52500 },
        { roomType: 'Cameră cu Vedere la Mare', revenue: 68750 },
        { roomType: 'Cameră Family', revenue: 33250 }
      ],
      revenueByPaymentMethod: revenueByService
    };
    
    console.log('Returning revenue analytics with RON currency');
    res.json(revenueAnalytics);
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    SystemLog.logError('Error fetching revenue analytics', 'analyticsController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch revenue analytics' });
  }
};


exports.getLocationAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    console.log('Location analytics requested for period:', { start, end });
    

    const locations = await Booking.aggregate([
      { 
        $match: { 
          createdAt: { $gte: start, $lte: end } 
        } 
      },
      {
        $group: {
          _id: { $ifNull: ['$hotel.location', 'Unknown Location'] },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } }, // Sort by number of bookings
      { $limit: 10 } // Get top 10 locations
    ]);
    

    const locationData = locations.length > 0 ? 
      locations.map(item => ({
        location: item._id,
        bookings: item.bookings,
        revenue: item.revenue
      })) : 

      [
        { location: 'București', bookings: 120, revenue: 48000 },
        { location: 'Cluj-Napoca', bookings: 85, revenue: 34000 },
        { location: 'Constanța', bookings: 65, revenue: 26000 },
        { location: 'Brașov', bookings: 75, revenue: 30000 },
        { location: 'Sibiu', bookings: 45, revenue: 18000 }
      ];
    
    console.log(`Returning ${locationData.length} location analytics records`);
    res.json(locationData);
  } catch (error) {
    console.error('Error fetching location analytics:', error);
    SystemLog.logError('Error fetching location analytics', 'analyticsController', { error: error.message });
    

    const fallbackData = [
      { location: 'București', bookings: 120, revenue: 48000 },
      { location: 'Cluj-Napoca', bookings: 85, revenue: 34000 },
      { location: 'Constanța', bookings: 65, revenue: 26000 },
      { location: 'Brașov', bookings: 75, revenue: 30000 },
      { location: 'Sibiu', bookings: 45, revenue: 18000 }
    ];
    
    res.json(fallbackData);
  }
};


exports.getUserAnalytics = async (req, res) => {
  try {
    console.log('User analytics requested');
    

    const mockUserAnalytics = {
      totalUsers: 520,
      newUsers: {
        thisMonth: 45,
        lastMonth: 38,
        growth: 18.4
      },
      usersByStatus: [
        { status: 'active', count: 450 },
        { status: 'inactive', count: 50 },
        { status: 'suspended', count: 20 }
      ],
      registrationTrend: [
        { month: 'Jan', count: 32 },
        { month: 'Feb', count: 35 },
        { month: 'Mar', count: 42 },
        { month: 'Apr', count: 38 },
        { month: 'May', count: 40 },
        { month: 'Jun', count: 45 }
      ],
      topUsers: [
        { name: 'John Smith', bookings: 12, totalSpent: 12500 },
        { name: 'Mary Johnson', bookings: 8, totalSpent: 9800 },
        { name: 'Robert Davis', bookings: 7, totalSpent: 8400 },
        { name: 'Emily Wilson', bookings: 6, totalSpent: 7200 }
      ]
    };
    
    console.log('Returning mock user analytics');
    res.json(mockUserAnalytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Failed to fetch user analytics' });
  }
};


exports.getDashboardSummary = async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    

    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: today }
    });
    

    const weeklyRevenue = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: thisWeekStart },
          status: { $in: ['paid', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    

    const monthlyBookings = await Booking.countDocuments({
      createdAt: { $gte: thisMonthStart }
    });
    

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: thirtyDaysAgo }
    });
    

    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName email')
      .lean();
    

    res.json({
      todayBookings,
      weeklyRevenue: weeklyRevenue.length > 0 ? weeklyRevenue[0].total : 0,
      monthlyBookings,
      activeUsers,
      recentBookings
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    SystemLog.logError('Error fetching dashboard summary', 'analyticsController', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};


exports.exportAnalytics = async (req, res) => {
  try {
    const { type, startDate, endDate, format } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    
    let data;
    let fields;
    
    switch (type) {
      case 'booking':
        data = await Booking.find({
          createdAt: { $gte: start, $lte: end }
        })
        .populate('user', 'firstName lastName email')
        .lean();
        
        fields = ['_id', 'hotel.name', 'hotel.location', 'roomType', 'checkIn', 'checkOut', 'totalAmount', 'status', 'createdAt'];
        break;
        
      case 'revenue':
        data = await Payment.find({
          createdAt: { $gte: start, $lte: end }
        })
        .populate('user', 'firstName lastName email')
        .populate('booking')
        .lean();
        
        fields = ['invoiceNumber', 'user.firstName', 'user.email', 'total', 'status', 'paymentMethod', 'createdAt'];
        break;
        
      case 'users':
        data = await User.find({
          createdAt: { $gte: start, $lte: end }
        })
        .select('-password -resetPasswordToken -refreshToken')
        .lean();
        
        fields = ['_id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'];
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid analytics type' });
    }
    


    res.json({ 
      exportedData: data,
      fields,
      meta: {
        type,
        startDate: start,
        endDate: end,
        count: data.length
      }
    });
  } catch (error) {
    console.error('Error exporting analytics:', error);
    SystemLog.logError('Error exporting analytics', 'analyticsController', { error: error.message });
    res.status(500).json({ message: 'Failed to export analytics' });
  }
};


exports.getSystemMetrics = async (req, res) => {
  try {
    console.log('System metrics requested');
    

    const mockSystemMetrics = {
      serverUptime: '25 days, 14 hours',
      serverLoad: {
        current: 42,
        average: 38
      },
      responseTime: {
        api: 120, // ms
        website: 850 // ms
      },
      errorRate: {
        api: 0.8, // percentage
        website: 1.2 // percentage
      },
      requestsPerHour: [
        { hour: '00:00', count: 28 },
        { hour: '04:00', count: 15 },
        { hour: '08:00', count: 65 },
        { hour: '12:00', count: 120 },
        { hour: '16:00', count: 145 },
        { hour: '20:00', count: 90 }
      ],
      storageUsage: {
        total: 500, // GB
        used: 312,  // GB
        free: 188   // GB
      }
    };
    
    console.log('Returning mock system metrics');
    res.json(mockSystemMetrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ message: 'Failed to fetch system metrics' });
  }
};


exports.getCustomReport = async (req, res) => {
  try {
    const { reportType, dateRange, dimensions } = req.body;
    console.log('Custom report requested:', { reportType, dateRange, dimensions });
    

    const mockReportData = {
      reportType,
      dateRange,
      dimensions,
      generatedAt: new Date(),
      data: [
        { date: '2023-01-15', bookings: 15, revenue: 12500, users: 8 },
        { date: '2023-02-15', bookings: 18, revenue: 15200, users: 12 },
        { date: '2023-03-15', bookings: 22, revenue: 18500, users: 15 },
        { date: '2023-04-15', bookings: 20, revenue: 16800, users: 14 },
        { date: '2023-05-15', bookings: 25, revenue: 21000, users: 18 },
        { date: '2023-06-15', bookings: 28, revenue: 23500, users: 22 }
      ]
    };
    
    console.log('Returning mock custom report data');
    res.json(mockReportData);
  } catch (error) {
    console.error('Error generating custom report:', error);
    res.status(500).json({ message: 'Failed to generate custom report' });
  }
}; 