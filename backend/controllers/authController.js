const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const generateToken = (id, expiresIn) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // Connection timeout in milliseconds
  greetingTimeout: 10000,  // How long to wait for greeting after connection
  socketTimeout: 10000,    // How long to wait for socket operations
  debug: true, // Show debug logs
  logger: true, // Log information about email sending
  tls: {
    rejectUnauthorized: false // More permissive for some network environments
  }
});

// Test the email configuration on startup
let emailFunctional = false;
let fallbackTransporter = null;

// Function to initialize a fallback transporter if Gmail fails
const initializeFallbackTransporter = () => {
  console.log('Initializing alternative Gmail configuration');
  try {
    // Try an alternative Gmail configuration
    fallbackTransporter = nodemailer.createTransport({
      service: 'gmail',  // Use the service name instead of host/port
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('Alternative email transporter initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize alternative transporter:', error);
    return false;
  }
};

// Add a direct notification method for critical messages when email transport fails
const logCriticalMessage = (subject, message) => {
  // Log the message to console at minimum
  console.log(`CRITICAL NOTIFICATION: ${subject}`);
  console.log(message);
  
  // Could implement other notification methods here:
  // - Writing to a special log file
  // - Using an alternative API service
  // - Sending an SMS via a third-party service
  
  // For now, we'll just log to stdout and create a log file
  try {
    const logEntry = `
-------------------------------------------
[${new Date().toISOString()}] ${subject}
-------------------------------------------
${message}
-------------------------------------------
`;
    
    // Try to append to a critical messages log file
    const criticalLogsPath = path.join(__dirname, '..', 'logs', 'critical_messages.log');
    fs.appendFileSync(criticalLogsPath, logEntry);
  } catch (error) {
    console.error('Failed to write critical message to log file:', error);
  }
};

// Function to send email with retry using fallback
const sendEmailWithRetry = async (mailOptions) => {
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

// Function to send admin verification email
const sendAdminVerificationEmail = async (user, verificationToken) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-admin?token=${verificationToken}&email=${user.email}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Admin Account Verification',
      html: `
        <h1>Boksy Admin Verification</h1>
        <p>Hello ${user.firstName},</p>
        <p>You have requested to create an administrator account for Boksy.</p>
        <p>To verify your account and activate admin privileges, please click the link below:</p>
        <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Verify Admin Account</a>
        <p>Or copy and paste this URL in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    };
    
    return await sendEmailWithRetry(mailOptions);
  } catch (error) {
    console.error('Error sending admin verification email:', error);
    throw error;
  }
};

// Alternative function for when email fails - generate a direct admin verification link
const generateVerificationLink = (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-admin?token=${verificationToken}&email=${user.email}`;
  return verificationUrl;
};

// Function to notify user of admin approval
const sendAdminApprovalEmail = async (user) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Your Admin Account has been Approved',
    html: `
      <h1>Boksy Admin Account Approved</h1>
      <p>Hello ${user.firstName},</p>
      <p>Your request for administrator access to Boksy has been approved!</p>
      <p>You can now log in with your admin privileges by clicking the link below:</p>
      <a href="${loginUrl}" style="padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
      <p>Thank you for being part of our team.</p>
      <p>The Boksy Team</p>
    `
  };
  
  return sendEmailWithRetry(mailOptions);
};

// Generate verification code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store pending admin registration requests
const pendingAdminRequests = new Map();

// Clean up expired requests (after 24 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, request] of pendingAdminRequests.entries()) {
    // If request is older than 24 hours (86400000 ms), delete it
    if (now - request.timestamp > 86400000) {
      pendingAdminRequests.delete(id);
    }
  }
}, 3600000); // Check every hour

// Register user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, subscriptionType } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // If user is requesting admin role
    if (role === 'admin') {
      console.log(`Admin registration request for: ${email}`);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Create user with admin role but not verified yet
      const user = new User({
        firstName,
        lastName,
        email,
        password, // Will be hashed by pre-save hook
        role: 'admin',
        adminVerified: false,
        adminVerificationToken: verificationToken,
        adminVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      
      await user.save();
      console.log(`Admin user created with verification token: ${user._id}`);
      
      // Send admin verification email
      await sendAdminVerificationEmail(user, verificationToken);
      
      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'Admin registration successful. Please check your email for verification.',
        email: email,
        redirectTo: '/verify-admin'
      });
    }

    // For non-admin registrations, save user directly
    const user = new User({
      firstName,
      lastName,
      email,
      password, // Pass the plain password - the model's pre-save hook will hash it
      role: role || 'client',
      bePartOfUs: {
        type: subscriptionType || 'free'
      }
    });

    await user.save();
    console.log(`User registered successfully: ${user._id}, role: ${user.role}`);

    // Generate token
    const token = generateToken(user._id, '30d');

    // Send welcome email to client
    try {
      await sendEmailWithRetry({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Boksy',
        html: `
          <h2>Welcome ${firstName} ${lastName}!</h2>
          <p>Thank you for registering on our platform.</p>
          <p>You can now log in and start using our services.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        subscription: subscriptionType || 'free'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message // Include error message for debugging
    });
  }
};

// Approve admin request
const approveAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log('Approving admin request:', requestId);
    
    const request = pendingAdminRequests.get(requestId);
    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }
    
    console.log('Found request:', request);

    // Check if this request has already been approved and has a verification code
    if (request.approved && request.verificationCode) {
      console.log('Request already approved, reusing existing verification code');
      
      // Resend the verification email with the existing code
      await sendEmailWithRetry({
        from: process.env.EMAIL_USER,
        to: request.userData.email,
        subject: 'Admin Registration Approved (Reminder)',
        html: `
          <h2>Admin Registration Approved</h2>
          <p>Your admin registration request has been approved!</p>
          <p>Please use the following verification code to complete your registration:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
            ${request.verificationCode}
          </h3>
          <p>This code will expire in 24 hours.</p>
          <p>Return to the verification page and enter this code to activate your admin account.</p>
        `
      });
      
      return res.json({ 
        success: true,
        message: 'Admin request already approved. Verification code resent.',
        userEmail: request.userData.email
      });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    console.log('Generated verification code:', verificationCode);

    // Update request with verification code and approval
    request.verificationCode = verificationCode;
    request.approved = true;
    request.approvedAt = Date.now();
    
    // Update the Map with the modified request
    pendingAdminRequests.set(requestId, request);
    
    console.log('Updated request:', pendingAdminRequests.get(requestId));

    // Send verification code to user
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: request.userData.email,
      subject: 'Admin Registration Approved',
      html: `
        <h2>Admin Registration Approved</h2>
        <p>Your admin registration request has been approved!</p>
        <p>Please use the following verification code to complete your registration:</p>
        <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
          ${verificationCode}
        </h3>
        <p>This code will expire in 24 hours.</p>
        <p>Return to the verification page and enter this code to activate your admin account.</p>
      `
    });

    res.json({ 
      success: true,
      message: 'Admin request approved successfully',
      userEmail: request.userData.email
    });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
};

// Reject admin request
const rejectAdminRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = pendingAdminRequests.get(requestId);

    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired request' });
    }

    // Send rejection email to user
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: request.userData.email,
      subject: 'Admin Registration Rejected',
      html: `
        <h2>Admin Registration Rejected</h2>
        <p>We regret to inform you that your admin registration request has been rejected.</p>
        <p>If you believe this was a mistake, please contact the system administrator.</p>
      `
    });

    // Remove request
    pendingAdminRequests.delete(requestId);

    res.json({ message: 'Admin request rejected successfully' });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify admin
const verifyAdmin = async (req, res) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email) {
      return res.status(400).json({ message: 'Missing verification parameters' });
    }
    
    // Find user by email and verification token
    const user = await User.findOne({ 
      email: email,
      adminVerificationToken: token,
      adminVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    
    // Check if already verified
    if (user.adminVerified) {
      return res.status(200).json({ 
        message: 'Your admin account is already verified. You can log in now.',
        status: 'already_verified'
      });
    }
    
    // Update user as verified admin
    user.role = 'admin';
    user.adminVerified = true;
    user.adminVerificationToken = undefined;
    user.adminVerificationExpires = undefined;
    
    await user.save();
    
    // Generate auth token for automatic login
    const authToken = generateToken(user._id, '30d');
    
    res.status(200).json({ 
      message: 'Admin account verified successfully!',
      token: authToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      success: true
    });
  } catch (error) {
    console.error('Verify admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    console.log(`Login attempt for: ${email}`);

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log(`User found: ${user._id}, role: ${user.role}`);
    
    // Verify password using bcrypt
    try {
      console.log('Attempting password comparison...');
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password comparison result: ${isMatch}`);
      
      if (!isMatch) {
        console.log('Password verification failed');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (passwordError) {
      console.error('Error during password comparison:', passwordError);
      return res.status(500).json({ message: 'Error verifying password' });
    }

    // Check if user is an admin but not verified
    if (user.role === 'admin' && !user.adminVerified) {
      return res.status(403).json({
        message: 'Your admin account needs verification',
        status: 'admin_pending',
        requiresVerification: true,
        email: user.email,
        redirectTo: '/verify-admin'
      });
    }

    // Update user activity data
    user.lastLogin = new Date();
    user.loginCount += 1;
    user.lastActive = new Date();
    
    // Add login activity to logs
    user.activityLogs.push({
      action: 'login',
      timestamp: new Date(),
      details: {
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    });
    
    // Limit the size of the activity logs array to prevent it from growing too large
    if (user.activityLogs.length > 100) {
      user.activityLogs = user.activityLogs.slice(-100); // Keep only the last 100 entries
    }
    
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, rememberMe ? '30d' : '24h');

    // Format user data for response
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      subscription: user.bePartOfUs?.type || 'free'
    };

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      token: token,
      user: userData,
      subscription: user.bePartOfUs?.type || 'free',
      lastLogin: user.lastLogin,
      loginCount: user.loginCount
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change subscription
const changeSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.subscription = subscription;
    await user.save();
    
    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Change subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Test email
const testEmail = async (req, res) => {
  try {
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: 'condurflorentin@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email'
    });
    
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend admin verification
const resendAdminVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.adminVerificationToken = verificationToken;
    await user.save();
    
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Admin Verification',
      text: `Your verification token is: ${verificationToken}`
    });
    
    res.json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a test user
const createTestUser = async (req, res) => {
  try {
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'client'
    };
    
    // Check if user already exists
    const userExists = await User.findOne({ email: testUser.email });
    if (userExists) {
      await User.findOneAndDelete({ email: testUser.email });
      console.log('Existing test user deleted');
    }
    
    // Create new user
    console.log('Creating new test user with password:', testUser.password);
    const user = new User(testUser);
    
    // Save user to DB
    await user.save();
    console.log('Test user created with ID:', user._id);
    
    res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: user._id,
        email: user.email,
        password: 'password123', // Clear text for testing
        firstName: user.firstName, 
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset user password (for debugging/testing only)
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Set new password
    user.password = newPassword;
    
    // Save user (password will be hashed by pre-save hook)
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Password for ${email} has been reset successfully`
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate password reset token and send email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }
    
    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiry on user model
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${email}`;
    
    // Send email
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>You requested a password reset</h1>
        <p>Dear ${user.firstName},</p>
        <p>You requested to reset your password. Please click the button below to reset your password:</p>
        <a href="${resetUrl}" style="padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy and paste this URL in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    });
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password with token validation
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    // Find user by email and valid token
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }
    
    // Update password
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Save user
    await user.save();
    
    // Send confirmation email
    await sendEmailWithRetry({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Successful',
      html: `
        <h1>Password Reset Successful</h1>
        <p>Dear ${user.firstName},</p>
        <p>Your password has been successfully reset.</p>
        <p>You can now log in with your new password.</p>
        <p>If you did not request this change, please contact support immediately.</p>
        <p>Thank you,<br>The Boksy Team</p>
      `
    });
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  verifyAdmin,
  changeSubscription,
  testEmail,
  resendAdminVerification,
  resetPassword,
  forgotPassword,
  resetPasswordWithToken
};