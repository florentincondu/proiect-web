/**
 * Async/await error handler for route handlers
 * Automatically catches errors and passes them to the error handling middleware
 * 
 * @param {Function} fn - Async function to handle
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler; 