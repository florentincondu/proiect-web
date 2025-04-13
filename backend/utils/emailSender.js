/**
 * Email Sender Utility
 * Provides functions for sending emails throughout the application
 */
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Variables to track email functionality
let emailFunctional = false;
let transporter = null;
let fallbackTransporter = null;

// Initialize the email transporter
const initializeTransporter = () => {
  try {
    // Create primary transporter using environment variables
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
    return false;
  }
};

// Initialize a fallback transport if the primary fails
const initializeFallbackTransporter = () => {
  try {
    // Check if fallback email settings exist
    if (process.env.FALLBACK_EMAIL_USER && process.env.FALLBACK_EMAIL_PASS) {
      fallbackTransporter = nodemailer.createTransport({
        host: process.env.FALLBACK_EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.FALLBACK_EMAIL_PORT || '587'),
        secure: process.env.FALLBACK_EMAIL_SECURE === 'true',
        auth: {
          user: process.env.FALLBACK_EMAIL_USER,
          pass: process.env.FALLBACK_EMAIL_PASS,
        },
      });
      
      console.log('Fallback email transport initialized');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to initialize fallback email transporter:', error);
    return false;
  }
};

// Log critical messages when email fails
const logCriticalMessage = (subject, message) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `
=========================================
${timestamp}
${subject}
-----------------------------------------
${message}
=========================================

`;
    
    const criticalLogsPath = path.join(__dirname, '..', 'logs', 'critical_messages.log');
    fs.appendFileSync(criticalLogsPath, logEntry);
  } catch (error) {
    console.error('Failed to write critical message to log file:', error);
  }
};

// Initialize the primary transporter
initializeTransporter();

// Verify the connection configuration
(async function() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await transporter.verify();
      console.log('Email configuration is valid and ready to send messages');
      emailFunctional = true;
    }
  } catch (error) {
    console.error('Email configuration error:', error);
    console.warn('Email functionality will not work. Please check your EMAIL_USER and EMAIL_PASS settings.');
    
    // Initialize fallback transport
    const fallbackInitialized = initializeFallbackTransporter();
    if (!fallbackInitialized) {
      console.error('Could not initialize any email transport. Email functionality will be completely disabled.');
    }
  }
})();

/**
 * Send an email with retry mechanism and fallback
 * @param {Object} mailOptions - The mail options (to, subject, text, html)
 * @returns {Promise} - Result of the email sending operation
 */
exports.sendEmail = async (mailOptions) => {
  // Add the from address if not provided
  if (!mailOptions.from) {
    mailOptions.from = process.env.EMAIL_USER || process.env.FALLBACK_EMAIL_USER;
  }
  
  // Set a flag to track if we've logged this message as critical
  let criticalLogged = false;
  
  if (emailFunctional) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Primary email transport failed:', error);
      
      // Try fallback if available
      if (fallbackTransporter) {
        try {
          console.log('Attempting to send via fallback transport');
          return await fallbackTransporter.sendMail(mailOptions);
        } catch (fallbackError) {
          console.error('Fallback email transport also failed:', fallbackError);
          
          // Log critical message since both transports failed
          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
          criticalLogged = true;
          
          throw fallbackError;
        }
      } else {
        // Log critical message since primary failed and no fallback exists
        if (!criticalLogged) {
          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
        }
        throw error;
      }
    }
  } else if (fallbackTransporter) {
    // If primary email is known to be non-functional, try fallback directly
    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Fallback email transport failed:', error);
      
      // Log critical message
      if (!criticalLogged) {
        logCriticalMessage(
          `Failed Email: ${mailOptions.subject}`, 
          `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
        );
      }
      
      throw error;
    }
  } else {
    // No transport available at all, just log the message
    logCriticalMessage(
      `Unsent Email: ${mailOptions.subject}`, 
      `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
    );
    throw new Error('No functional email transport available');
  }
}; 