const Setting = require('../models/Setting');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to check if the site is in maintenance mode
 * If it is, only admins will be allowed to access the site
 */
const maintenanceCheck = async (req, res, next) => {
  try {
    // Check if user is admin first - this happens only once per request
    let isAdmin = false;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role');
        if (user && user.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        // Token invalid or expired, user is not admin
        console.error('Admin check error:', error);
      }
    }
    
    // If user is admin, always bypass maintenance mode
    if (isAdmin) {
      return next();
    }

    // Always allow access to maintenance status endpoint and login endpoint
    if (
      req.path === '/api/support/maintenance-status' ||
      req.path.startsWith('/api/auth/login')
    ) {
      return next();
    }

    // Check if maintenance mode is enabled
    const setting = await Setting.findOne({ key: 'system.maintenanceMode' });
    if (setting && setting.value === true) {
      // Get maintenance message and completion time if available
      const messageData = await Setting.findOne({ key: 'system.maintenanceMessage' });
      const completionData = await Setting.findOne({ key: 'system.maintenanceCompletionTime' });

      return res.status(503).json({ 
        message: 'Site is under maintenance',
        maintenanceMode: true,
        maintenanceMessage: messageData ? messageData.value : 'We are currently performing scheduled maintenance. Please check back later.',
        completionTime: completionData ? completionData.value : null
      });
    }

    next();
  } catch (error) {
    console.error('Error in maintenance middleware:', error);
    // If there's an error, still allow the request through
    next();
  }
};

module.exports = maintenanceCheck; 