/**
 * Custom error class for API errors
 * Extends the built-in Error class with additional properties for HTTP status codes
 */
class CustomError extends Error {
  /**
   * Create a custom API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Flag to identify operational errors (vs programming errors)
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError; 