const { logToFile } = require('../utils/helpers');
const CustomError = require('../utils/CustomError');

/**
 * Global error handler middleware
 */
module.exports = (err, req, res, next) => {

  console.error(err);
  

  const errorDetails = `
    Error: ${err.message}
    Stack: ${err.stack}
    URL: ${req.originalUrl}
    Method: ${req.method}
    IP: ${req.ip}
    User: ${req.user ? req.user.id : 'Not authenticated'}
  `;
  logToFile(errorDetails, 'errors.log');


  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  const message = err.message || 'Something went wrong';


  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(val => val.message)
    });
  }

  if (err.code === 11000) {

    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `Duplicate field value: ${field}. Please use another value.`
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token. Please log in again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Your token has expired. Please log in again.'
    });
  }


  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {

    return res.status(statusCode).json({
      status,
      message,
      error: err,
      stack: err.stack
    });
  }


  return res.status(statusCode).json({
    status,
    message: err instanceof CustomError ? message : 'Something went wrong'
  });
}; 