const fs = require('fs');
const path = require('path');
const CustomError = require('./CustomError');

/**
 * Log a message to a file with timestamp
 * @param {string} message - The message to log
 * @param {string} logFile - The log file path (default: server.log)
 */
exports.logToFile = (message, logFile = 'server.log') => {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logPath = path.join(logsDir, logFile);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
};

/**
 * Async/await error handler for route handlers
 * @param {Function} fn - Async function to handle
 */
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Create a custom error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
exports.createError = (message, statusCode) => {
  return new CustomError(message, statusCode);
};

/**
 * Handle API response formatting
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {object|array} data - Data to send
 * @param {string} message - Optional message
 */
exports.sendResponse = (res, statusCode, data, message = '') => {
  res.status(statusCode).json({
    status: statusCode < 400 ? 'success' : 'error',
    message,
    data
  });
}; 