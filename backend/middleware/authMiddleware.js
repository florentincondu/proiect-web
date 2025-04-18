const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Middleware to authorize users based on their role
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} - Express middleware
 */
exports.authorize = (roles = []) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not authenticated' });
    }


    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role '${req.user.role}' is not authorized to access this resource` 
      });
    }


    next();
  };
};

/**
 * Middleware to check if user is an admin
 * @returns {Function} - Express middleware
 */
exports.admin = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not authenticated' });
  }


  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Not authorized, admin access required' 
    });
  }

  next();
};

/**
 * Middleware to handle guest access (either authenticated or not)
 * @returns {Function} - Express middleware
 */
exports.allowGuest = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
        }
      } catch (error) {

        req.user = null;
      }
    } else {

      req.user = null;
    }
    
    next();
  } catch (error) {

    req.user = null;
    next();
  }
};