/**
 * Email Sender Utility
 * Provides functions for sending emails throughout the application
 */
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');


let emailFunctional = false;
let transporter = null;
let fallbackTransporter = null;

const initializeTransporter = () => {
  try {
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


const initializeFallbackTransporter = () => {
  try {

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


initializeTransporter();


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

  if (!mailOptions.from) {
    mailOptions.from = process.env.EMAIL_USER || process.env.FALLBACK_EMAIL_USER;
  }
  

  let criticalLogged = false;
  
  if (emailFunctional) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Primary email transport failed:', error);
      

      if (fallbackTransporter) {
        try {
          console.log('Attempting to send via fallback transport');
          return await fallbackTransporter.sendMail(mailOptions);
        } catch (fallbackError) {
          console.error('Fallback email transport also failed:', fallbackError);
          

          logCriticalMessage(
            `Failed Email: ${mailOptions.subject}`, 
            `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
          );
          criticalLogged = true;
          
          throw fallbackError;
        }
      } else {

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

    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Fallback email transport failed:', error);
      

      if (!criticalLogged) {
        logCriticalMessage(
          `Failed Email: ${mailOptions.subject}`, 
          `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
        );
      }
      
      throw error;
    }
  } else {

    logCriticalMessage(
      `Unsent Email: ${mailOptions.subject}`, 
      `To: ${mailOptions.to}\n\nContent: ${mailOptions.html || mailOptions.text}`
    );
    throw new Error('No functional email transport available');
  }
}; 